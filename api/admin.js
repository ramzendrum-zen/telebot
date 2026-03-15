import express from 'express';
import connectDB from '../database/mongo.js';
import Complaint from '../database/models/Complaint.js';
import User from '../database/models/User.js';
import Admin from '../database/models/Admin.js';
import logger from '../utils/logger.js';

const router = express.Router();

// 1. Get All Complaints
router.get('/complaints', async (req, res) => {
  try {
    await connectDB();
    const complaints = await Complaint.find().sort({ created_at: -1 }).populate('student_id');
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Update Complaint Status
router.patch('/complaints/:id', async (req, res) => {
  try {
    const { status, admin_response } = req.body;
    await connectDB();
    const updated = await Complaint.findOneAndUpdate(
      { complaint_id: req.params.id },
      { status, admin_response, updated_at: new Date() },
      { new: true }
    );
    
    // In a real app, send a Telegram notification to the student here!
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Analytics
router.get('/stats', async (req, res) => {
    try {
        await connectDB();
        const stats = await Complaint.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
