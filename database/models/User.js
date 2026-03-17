import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  user_id: { type: String, unique: true, sparse: true }, // USR-XXXX
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
  email: { 
    type: String, 
    unique: true, 
    sparse: true,
    match: [/^[a-zA-Z0-9._%+-]+@msajce-edu\.in$/, 'Only official MSAJCE email addresses are allowed.']
  },
  
  // Verification System
  verified: { type: Boolean, default: false },
  otp: { type: String },
  otp_expiry: { type: Date },
  otp_attempts: { type: Number, default: 0 },
  
  // Rate Limiting (Anti-Spam)
  complaints_today_count: { type: Number, default: 0 },
  last_complaint_date: { type: Date },
  emergency_today_count: { type: Number, default: 0 },
  last_emergency_date: { type: Date },

  // RAG Session Context
  last_entity: { type: String },
  last_topic: { type: String },
  last_question: { type: String },
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Update updated_at on change
userSchema.pre('save', function() {
  this.updated_at = Date.now();
});

const User = mongoose.model('User', userSchema);

export default User;
