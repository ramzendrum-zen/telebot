import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  chatId: { type: Number, required: true },
  name: { type: String, required: true },
  rollNumber: { type: String },
  issue: { type: String, required: true },
  status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;
