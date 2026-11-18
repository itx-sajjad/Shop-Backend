import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    oldPrice: Number,
    rating: { type: Number, default: 4.5 },
    image: String,
    category: { type: String, default: 'T-shirts' },
    isNewArrival: { type: Boolean, default: false },
    isTopSelling: { type: Boolean, default: false },
    stock: { type: Number, default: 50 },
  },
  { timestamps: true }
);

const orderSchema = new mongoose.Schema(
  {
    customer: {
      name: { type: String, required: true },
      email: String,
      phone: String,
      address: { type: String, required: true },
      city: String,
    },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        qty: Number,
      },
    ],
    total: Number,
    status: { type: String, enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'], default: 'Pending' },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
export const Product = mongoose.model('Product', productSchema);
export const Order = mongoose.model('Order', orderSchema);
