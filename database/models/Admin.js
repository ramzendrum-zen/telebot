import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hashed
  role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
  created_at: { type: Date, default: Date.now }
});

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;
