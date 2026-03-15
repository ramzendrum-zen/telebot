import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  complaint_id: { type: String, required: true, unique: true }, // GRV-XXXX
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  telegram_id: { type: Number, required: true },
  category: { 
    type: String, 
    required: true,
    enum: [
      'Hostel Issues', 'Transport / Bus', 'Mess / Food', 
      'Faculty Issues', 'Infrastructure', 'WiFi / IT Issues', 
      'Administration', 'Harassment / Misconduct', 'Other',
      'Library Issues', 'Sports / Gym', 'Placement / Training',
      'Fee / Scholarship', 'Certificate / Document', 
      'Cleanliness / Hygiene', 'Lab Equipment', 'Marks / Attendance'
    ]
  },
  description: { type: String, required: true },
  evidence_url: { type: String },
  status: { 
    type: String, 
    enum: ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected'], 
    default: 'submitted' 
  },
  department_assigned: { type: String },
  admin_response: { type: String },
  resolution_notes: { type: String },
  feedback: { type: String, enum: ['Yes', 'No'] },
  is_emergency: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Update updated_at on change
complaintSchema.pre('save', function() {
  this.updated_at = Date.now();
});

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;
