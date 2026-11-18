import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { User, Product, Order } from './models.js';

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function adminOnly(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);
    if (data.role !== 'admin') throw new Error('not admin');
    req.user = data;
    next();
  } catch {
    res.status(401).json({ message: 'Login zaroori hai' });
  }
}

router.post('/newsletter/subscribe', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  if (!email || email.length > 254 || !emailPattern.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  const smtpEmail = process.env.SMTP_EMAIL?.trim();
  const smtpPass = process.env.SMTP_PASS?.replace(/\s/g, '');
  if (!smtpEmail || !smtpPass) {
    return res.status(503).json({ message: 'Newsletter email is not configured on the server.' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: smtpEmail, pass: smtpPass },
  });

  try {
    await transporter.sendMail({
      from: { name: 'SHOP.CO', address: smtpEmail },
      to: email,
      subject: 'Welcome to SHOP.CO',
      text: "Thanks for subscribing to SHOP.CO. You'll receive our latest offers and updates.",
      html: `<!doctype html>
        <html lang="en">
          <body style="margin:0;padding:32px;background:#f0eeed;font-family:Arial,sans-serif;color:#000">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr><td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
                  <tr><td style="padding:28px 32px;background:#000;color:#fff;font-size:26px;font-weight:700;letter-spacing:-1px">SHOP.CO</td></tr>
                  <tr><td style="padding:32px">
                    <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2">You're on the list!</h1>
                    <p style="margin:0 0 12px;color:#444;font-size:16px;line-height:1.6">Thanks for subscribing to SHOP.CO.</p>
                    <p style="margin:0;color:#666;font-size:15px;line-height:1.6">Look out for our latest styles, news, and exclusive offers in your inbox.</p>
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </body>
        </html>`,
    });

    return res.json({ message: "You're subscribed! Check your inbox for a welcome email." });
  } catch (error) {
    console.error('Newsletter subscription email failed:', error);
    const isGmailAuthError = error?.code === 'EAUTH' || error?.responseCode === 535;
    const message = isGmailAuthError
      ? 'Gmail rejected the SMTP login. Use the same Gmail address and its 16-character Google App Password in backend/.env, not your regular Gmail password.'
      : 'We could not send your email. Please try again later.';
    return res.status(502).json({ message });
  }
});

// ---------- Auth ----------
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.password))) {
    return res.status(400).json({ message: 'Email ya password ghalat hai' });
  }
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { name: user.name, email: user.email } });
});

// ---------- Products ----------
router.get('/products', async (req, res) => {
  const { category, tag, q } = req.query;
  const filter = {};
  if (category && category !== 'All') filter.category = category;
  if (tag === 'new') filter.isNewArrival = true;
  if (tag === 'top') filter.isTopSelling = true;
  if (q) filter.name = { $regex: q, $options: 'i' };
  res.json(await Product.find(filter).sort({ createdAt: -1 }));
});

router.get('/products/:id', async (req, res) => {
  const p = await Product.findById(req.params.id).catch(() => null);
  if (!p) return res.status(404).json({ message: 'Product nahi mila' });
  res.json(p);
});

router.post('/products', adminOnly, async (req, res) => {
  res.status(201).json(await Product.create(req.body));
});

router.put('/products/:id', adminOnly, async (req, res) => {
  res.json(await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

router.delete('/products/:id', adminOnly, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ---------- Orders ----------
router.post('/orders', async (req, res) => {
  const { customer, items } = req.body;
  if (!customer?.name || !customer?.address || !items?.length) {
    return res.status(400).json({ message: 'Naam, address aur items zaroori hain' });
  }
  const ids = items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: ids } });
  const lines = [];
  let total = 0;
  for (const i of items) {
    const p = products.find((x) => String(x._id) === String(i.product));
    if (!p) continue;
    const qty = Math.max(1, Number(i.qty) || 1);
    lines.push({ product: p._id, name: p.name, price: p.price, qty });
    total += p.price * qty; // price server se, client par bharosa nahi
  }
  if (!lines.length) return res.status(400).json({ message: 'Koi valid product nahi mila' });
  const order = await Order.create({ customer, items: lines, total });
  res.status(201).json(order);
});

router.get('/orders', adminOnly, async (req, res) => {
  res.json(await Order.find().sort({ createdAt: -1 }));
});

router.patch('/orders/:id', adminOnly, async (req, res) => {
  res.json(await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }));
});

// ---------- Dashboard stats ----------
router.get('/stats', adminOnly, async (req, res) => {
  const [products, orders] = await Promise.all([Product.countDocuments(), Order.find().sort({ createdAt: -1 })]);
  const active = orders.filter((o) => o.status !== 'Cancelled');
  res.json({
    products,
    orders: orders.length,
    pending: orders.filter((o) => o.status === 'Pending').length,
    revenue: active.reduce((s, o) => s + (o.total || 0), 0),
    recent: orders.slice(0, 6),
  });
});

export default router;
