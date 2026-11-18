import 'dotenv/config';
import { existsSync } from 'node:fs';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { User, Product } from './models.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.join(__dirname, 'public', 'images');
const unsplashImages = [
  'https://images.unsplash.com/photo-1627225924765-552d49cf47ad?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1618354691229-88d47f285158?auto=format&fit=crop&w=800&q=85',
  'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=800&q=85',
];

const imageFor = (name, index) => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const extension = ['jpg', 'png', 'webp'].find((ext) => existsSync(path.join(imagesDir, `${slug}.${ext}`)));
  if (!extension) return unsplashImages[index % unsplashImages.length];
  return `${process.env.PUBLIC_URL || 'http://localhost:5000'}/images/${slug}.${extension}`;
};

const products = [
  { name: 'T-shirt with Tape Details', price: 120, rating: 4.5, category: 'T-shirts', isNewArrival: true },
  { name: 'Skinny Fit Jeans', price: 240, oldPrice: 260, rating: 3.5, category: 'Jeans', isNewArrival: true },
  { name: 'Checkered Shirt', price: 180, rating: 4.5, category: 'Shirts', isNewArrival: true },
  { name: 'Sleeve Striped T-shirt', price: 130, oldPrice: 160, rating: 4.5, category: 'T-shirts', isNewArrival: true },
  { name: 'Vertical Striped Shirt', price: 212, oldPrice: 232, rating: 5, category: 'Shirts', isTopSelling: true },
  { name: 'Courage Graphic T-shirt', price: 145, rating: 4, category: 'T-shirts', isTopSelling: true },
  { name: 'Loose Fit Bermuda Shorts', price: 80, rating: 3, category: 'Shorts', isTopSelling: true },
  { name: 'Faded Skinny Jeans', price: 210, rating: 4.5, category: 'Jeans', isTopSelling: true },
  { name: 'Gradient Graphic T-shirt', price: 145, rating: 3.5, category: 'T-shirts' },
  { name: 'Polo with Tipping Details', price: 180, rating: 4.5, category: 'Shirts' },
  { name: 'Black Striped T-shirt', price: 120, oldPrice: 150, rating: 5, category: 'T-shirts' },
  { name: 'Denim Cargo Shorts', price: 95, rating: 4, category: 'Shorts' },
].map((p, i) => ({ ...p, image: imageFor(p.name, i) }));

await mongoose.connect(process.env.MONGO_URI);

await Product.deleteMany({});
await Product.insertMany(products);

const email = (process.env.ADMIN_EMAIL || 'admin@shop.com').toLowerCase();
await User.deleteMany({ email });
await User.create({
  name: 'Admin',
  email,
  password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@12345', 10),
  role: 'admin',
});

console.log('Seed mukammal. Admin:', email);
await mongoose.disconnect();
