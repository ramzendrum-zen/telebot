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

// 2. Get All Users
router.get('/users', async (req, res) => {
  try {
    await connectDB();
    const users = await User.find().sort({ created_at: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Update Complaint
router.patch('/complaints/:id', async (req, res) => {
  try {
    const { status, admin_response, priority, department_assigned } = req.body;
    await connectDB();
    const updateData = { updated_at: new Date() };
    if (status) updateData.status = status;
    if (admin_response) updateData.admin_response = admin_response;
    if (priority) updateData.priority = priority;
    if (department_assigned) updateData.department_assigned = department_assigned;

    const updated = await Complaint.findOneAndUpdate(
      { complaint_id: req.params.id },
      updateData,
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Detailed Analytics
router.get('/stats', async (req, res) => {
    try {
        await connectDB();
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const totalUsers = await User.countDocuments();
        const activeToday = await User.countDocuments({ updated_at: { $gte: startOfDay } });
        
        const totalComplaints = await Complaint.countDocuments();
        const openComplaints = await Complaint.countDocuments({ status: { $ne: 'resolved' } });
        const resolvedComplaints = await Complaint.countDocuments({ status: 'resolved' });
        const alertsToday = await Complaint.countDocuments({ is_emergency: true, created_at: { $gte: startOfDay } });
        const complaintsToday = await Complaint.countDocuments({ created_at: { $gte: startOfDay } });

        constByCategory = await Complaint.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        constByStatus = await Complaint.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        res.json({
            users: { total: totalUsers, active_today: activeToday },
            complaints: {
                total: totalComplaints,
                open: openComplaints,
                resolved: resolvedComplaints,
                alerts_today: alertsToday,
                today: complaintsToday
            },
            byCategory: constByCategory,
            byStatus: constByStatus
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
