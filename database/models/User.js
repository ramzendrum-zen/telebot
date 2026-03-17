import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  user_id: { type: String, unique: true }, // USR-XXXX
  role: { type: String, enum: ['student', 'staff'], default: 'student' },
  telegram_id: { type: Number, required: true, unique: true },
  telegram_username: { type: String },
  telegram_first_name: { type: String },
  telegram_last_name: { type: String },
  
  // Student Specific
  register_number: { type: String, unique: true, sparse: true },
  year: { type: Number },
  residence_type: { type: String, enum: ['Hostel', 'Day Scholar'] },
  room_number: { type: String },
  
  // Staff Specific
  employee_id: { type: String, unique: true, sparse: true },
  designation: { type: String },
  
  // Common
  salutation: { type: String, enum: ['Mr.', 'Ms.'] },
  name: { type: String },
  department: { type: String },
  phone: { type: String },
  verified: { type: Boolean, default: false },
  
  // RAG Session Context
  last_entity: { type: String },
  last_topic: { type: String },
  last_question: { type: String },
  
  created_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

export default User;
