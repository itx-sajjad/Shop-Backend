import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import routes from './routes.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const origins = (process.env.CLIENT_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);

app.use(cors({ origin: origins.length ? origins : true }));
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.get('/', (req, res) => res.json({ ok: true, message: 'Shop API chal rahi hai' }));
app.use('/api', routes);
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log('Server port ' + PORT + ' par chal raha hai')))
  .catch((e) => {
    console.error('MongoDB connect nahi hua:', e.message);
    process.exit(1);
  });
