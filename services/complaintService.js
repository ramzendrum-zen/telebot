import { getCache, setCache } from './cacheService.js';
import Complaint from '../database/models/Complaint.js';
import User from '../database/models/User.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';
import nodemailer from 'nodemailer';
import { getOrCreateUser, verifyUser } from './userService.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'eventbooking.otp@gmail.com',
    pass: 'bcfr ckfv emwp vwbi'
  }
});

const COMPLAINT_STATE_PREFIX = 'grv_state:';
const VERIFY_STATE_PREFIX = 'verify_state:';

// Department Routing Mapping
const DEPT_ROUTING = {
  'Transport / Bus': 'Transport Manager',
  'Hostel Issues': 'Hostel Warden',
  'Mess / Food': 'Mess Committee',
  'WiFi / IT Issues': 'IT Support Team',
  'Faculty Issues': 'Academic Office',
  'Administration': 'Admin Office',
  'Harassment / Misconduct': 'Principal / Disciplinary Committee',
  'Infrastructure': 'Estate Office',
  'Other': 'General Admin'
};

/**
 * Auto-generates a unique Complaint ID: GRV-XXXX
 */
const generateComplaintId = async () => {
  const count = await Complaint.countDocuments();
  const hex = (count + 2043).toString().padStart(4, '0'); // Start from 2043 as per prompt example
  return `GRV-${hex}`;
};

/**
 * Handles the Student Verification Flow
 */
export const handleVerificationFlow = async (chatId, text) => {
  const stateKey = `${VERIFY_STATE_PREFIX}${chatId}`;
  const state = await getCache(stateKey) || { step: 'asking_reg' };
  
  let response = "";
  let nextState = { ...state };

  if (state.step === 'asking_reg') {
    nextState.register_number = text;
    nextState.step = 'asking_dept';
    response = "Please enter your **Department** (e.g., CSE, EEE, Mech):";
  } else if (state.step === 'asking_dept') {
    nextState.department = text;
    nextState.step = 'asking_year';
    response = "Please enter your **Year of Study** (1, 2, 3, or 4):";
  } else if (state.step === 'asking_year') {
    const year = parseInt(text);
    if (isNaN(year) || year < 1 || year > 4) {
      return "Invalid year. Please enter a number between 1 and 4:";
    }
    
    await verifyUser(chatId, {
      register_number: nextState.register_number,
      department: nextState.department,
      year: year
    });

    response = "✅ **Verification Successful!** You can now register complaints. Use the menu below:";
    nextState = null;
  }

  if (nextState) await setCache(stateKey, nextState);
  else await setCache(stateKey, null);

  return response;
};

/**
 * Lists all complaints for a specific user
 */
export const listUserComplaints = async (chatId) => {
  try {
    const complaints = await Complaint.find({ telegram_id: chatId }).sort({ created_at: -1 }).limit(5);
    if (complaints.length === 0) return "You haven't submitted any complaints yet.";
    
    let text = "📋 **Your Recent Complaints**\n\n";
    complaints.forEach((c, i) => {
        text += `${i+1}. **${c.complaint_id}** — ${c.status.toUpperCase()}\n   Category: ${c.category}\n\n`;
    });
    return text;
  } catch (e) { return "Error fetching your complaints."; }
};

/**
 * Handles the Main Grievance Flow Controller (Updated)
 */
export const handleGrievanceFlow = async (chatId, text, message) => {
  const user = await getOrCreateUser(chatId);
  if (!user.verified) return await handleVerificationFlow(chatId, text);

  // My Complaints Shortcut
  if (text.includes('My Complaints')) return await listUserComplaints(chatId);
  
  // FAQ / Help Shortcut
  if (text.includes('FAQ / Help')) {
    return "💡 **MSAJCE FAQ & Help**\n\n" +
           "• **Hostel Timings**: 6:00 AM - 8:30 PM\n" +
           "• **Bus Routes**: Check 'Transport' in main bot menu\n" +
           "• **Office Timings**: 9:00 AM - 4:30 PM\n" +
           "• **Exam Timetable**: Available on college website\n\n" +
           "Use 'Register Complaint' for official grievances.";
  }

  // Contact administration
  if (text.includes('Contact Administration')) {
      return "📞 **Administration Contact**\n\n• **General Office**: 044-27477025\n• **Email**: info@msajce-edu.in\n• **Address**: OMR, IT Highway, Chennai.";
  }

  const stateKey = `${COMPLAINT_STATE_PREFIX}${chatId}`;
  const state = await getCache(stateKey) || { step: 'init' };
// ... remaining logic same as before (I'll just replace the whole file for safety if needed, but I'll use replace_file_content smartly)

  if (state.step === 'asking_category') {
    const categories = Object.keys(DEPT_ROUTING);
    if (!categories.includes(text)) return "Please select a valid category from the buttons.";
    
    nextState.category = text;
    nextState.step = 'asking_desc';
    return {
      text: `Category: **${text}**\n\nPlease describe your issue clearly. Include location, time, and specific details:`,
      keyboard: [['Cancel']]
    };
  }

  if (state.step === 'asking_desc') {
    if (text === 'Cancel') {
      await setCache(stateKey, null);
      return "Complaint registration cancelled.";
    }
    nextState.description = text;
    nextState.step = 'asking_evidence';
    return {
      text: "Would you like to upload any **Evidence**? (Image, Document, or Video)\n\nType 'Skip' if you don't have any.",
      keyboard: [['Skip', 'Cancel']]
    };
  }

  if (state.step === 'asking_evidence') {
    if (text === 'Cancel') {
      await setCache(stateKey, null);
      return "Complaint registration cancelled.";
    }
    
    let evidenceUrl = 'None';
    if (message.photo) {
        // In a real app, upload to Cloudinary. For now, we'll store the file_id or a placeholder.
        evidenceUrl = `telegram_file_id:${message.photo[message.photo.length - 1].file_id}`;
    } else if (message.document) {
        evidenceUrl = `telegram_file_id:${message.document.file_id}`;
    }
    
    nextState.evidence_url = evidenceUrl;
    
    // Final Confirmation
    const grvId = await generateComplaintId();
    const dept = DEPT_ROUTING[nextState.category];

    const newComplaint = new Complaint({
      complaint_id: grvId,
      student_id: user._id,
      telegram_id: chatId,
      category: nextState.category,
      description: nextState.description,
      evidence_url: evidenceUrl,
      department_assigned: dept
    });

    await newComplaint.save();

    // Send Email Alert
    try {
      await transporter.sendMail({
        from: 'eventbooking.otp@gmail.com',
        to: 'cookwithcomali5@gmail.com',
        subject: `[EMERGENCY: ${nextState.category === 'Harassment / Misconduct' ? 'YES' : 'NO'}] New Grievance: ${grvId}`,
        text: `ID: ${grvId}\nCategory: ${nextState.category}\nStudent: ${user.name || 'Anonymous'}\nDescription: ${nextState.description}\nAssigned To: ${dept}`
      });
    } catch (e) { logger.error(`Email fail: ${e.message}`); }

    response = `✅ **Complaint Submitted Successfully**\n\n**Complaint ID:** ${grvId}\n**Category:** ${nextState.category}\n**Status:** Submitted\n**Assigned To:** ${dept}\n\nYou can track this using the **Track Complaint** option.`;
    await setCache(stateKey, null);
    return response;
  }

  return "I didn't quite catch that. Use the menu or type /start.";
};

/**
 * Tracks a complaint by ID
 */
export const trackComplaint = async (complaintId) => {
  try {
    const grv = await Complaint.findOne({ complaint_id: complaintId.toUpperCase() });
    if (!grv) return "❌ Complaint ID not found. Please double-check and try again.";
    
    return `**Complaint Tracking** 🔍\n\n**ID:** ${grv.complaint_id}\n**Category:** ${grv.category}\n**Status:** ${grv.status.toUpperCase()}\n**Assigned To:** ${grv.department_assigned}\n**Last Update:** ${new Date(grv.updated_at).toLocaleDateString()}`;
  } catch (e) {
    return "Error tracking complaint.";
  }
};
