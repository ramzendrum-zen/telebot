import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  telegram_id: { type: Number, required: true, unique: true },
  register_number: { type: String, unique: true, sparse: true },
  name: { type: String },
  department: { type: String },
  year: { type: Number },
  verified: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

export default User;
