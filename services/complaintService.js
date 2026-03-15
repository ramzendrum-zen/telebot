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
    user: config.email.user,
    pass: config.email.pass
  }
});

const COMPLAINT_STATE_PREFIX = 'grv_state:';
const VERIFY_STATE_PREFIX = 'verify_state:';

// Department Routing Mapping
const DEPT_ROUTING = {
  'Hostel Issues': 'Hostel Warden',
  'Transport / Bus': 'Transport Manager',
  'Mess / Food': 'Mess Committee',
  'WiFi / IT Issues': 'IT Support Team',
  'Faculty Issues': 'Academic Office',
  'Administration': 'Admin Office',
  'Harassment / Misconduct': 'Principal / Disciplinary Committee',
  'Infrastructure': 'Estate Office',
  'Other': 'General Admin'
};

/** The main menu keyboard structure */
export const MAIN_MENU = {
  text: "🏫 *MSAJCE Grievance Portal*\n\nWelcome! How can we help you today?",
  keyboard: {
    keyboard: [
      ['📝 Register Complaint', '🔍 Track Complaint'],
      ['📋 My Complaints', '🚨 Emergency Complaint'],
      ['💡 FAQ / Help', '📞 Contact Administration']
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

/** Auto-generates a unique Complaint ID: GRV-XXXX */
const generateComplaintId = async () => {
  const count = await Complaint.countDocuments();
  return `GRV-${(count + 2043).toString().padStart(4, '0')}`;
};

/**
 * Handles the Student Verification Flow
 * Shows a prompt BEFORE accepting input so the user knows what to enter.
 */
export const handleVerificationFlow = async (chatId, text) => {
  const stateKey = `${VERIFY_STATE_PREFIX}${chatId}`;
  const state = await getCache(stateKey);

  // No active state — start the verification
  if (!state) {
    await setCache(stateKey, { step: 'asking_reg' });
    return { 
      text: "🔐 *First-time Setup*\n\nTo use the grievance system, please verify your identity.\n\nEnter your *Register Number* (e.g., 312221104001):",
      keyboard: { keyboard: [['❌ Cancel']], resize_keyboard: true }
    };
  }

  if (text === '❌ Cancel') {
    await setCache(stateKey, null);
    return MAIN_MENU;
  }

  let nextState = { ...state };
  let response;

  if (state.step === 'asking_reg') {
    nextState.register_number = text;
    nextState.step = 'asking_name';
    await setCache(stateKey, nextState);
    response = { 
      text: "✅ Register number saved!\n\nNow enter your *Full Name*:",
      keyboard: { keyboard: [['❌ Cancel']], resize_keyboard: true }
    };
  } else if (state.step === 'asking_name') {
    nextState.name = text;
    nextState.step = 'asking_dept';
    await setCache(stateKey, nextState);
    response = { 
      text: "Now enter your *Department* (e.g., CSE, ECE, EEE, Mech, IT):",
      keyboard: { keyboard: [['CSE', 'ECE'], ['EEE', 'Mech'], ['IT', 'Civil'], ['❌ Cancel']], resize_keyboard: true }
    };
  } else if (state.step === 'asking_dept') {
    nextState.department = text;
    nextState.step = 'asking_year';
    await setCache(stateKey, nextState);
    response = { 
      text: "Enter your *Year of Study*:",
      keyboard: { keyboard: [['1st Year', '2nd Year'], ['3rd Year', '4th Year'], ['❌ Cancel']], resize_keyboard: true }
    };
  } else if (state.step === 'asking_year') {
    const yearMap = { '1st Year': 1, '2nd Year': 2, '3rd Year': 3, '4th Year': 4, '1': 1, '2': 2, '3': 3, '4': 4 };
    const year = yearMap[text];
    if (!year) {
      return { 
        text: "⚠️ Invalid! Please tap one of the year buttons:",
        keyboard: { keyboard: [['1st Year', '2nd Year'], ['3rd Year', '4th Year']], resize_keyboard: true }
      };
    }

    await verifyUser(chatId, {
      register_number: nextState.register_number,
      name: nextState.name,
      department: nextState.department,
      year
    });

    await setCache(stateKey, null);
    return {
      text: `✅ *Verified Successfully!*\n\nWelcome, *${nextState.name}*! (${nextState.department}, Year ${year})\n\nYou can now register and track your complaints.`,
      keyboard: MAIN_MENU.keyboard
    };
  }

  return response;
};

/**
 * Lists recent complaints for a user
 */
export const listUserComplaints = async (chatId) => {
  try {
    const complaints = await Complaint.find({ telegram_id: chatId }).sort({ created_at: -1 }).limit(5);
    if (complaints.length === 0) return { 
      text: "📋 You haven't submitted any complaints yet.\n\nUse *Register Complaint* to submit one.",
      keyboard: MAIN_MENU.keyboard
    };

    let text = "📋 *Your Recent Complaints*\n\n";
    complaints.forEach((c, i) => {
      const statusIcon = c.status === 'resolved' ? '✅' : c.status === 'in_progress' ? '🔄' : '⏳';
      text += `${i + 1}. *${c.complaint_id}* ${statusIcon}\n   • Category: ${c.category}\n   • Status: ${c.status.toUpperCase()}\n\n`;
    });
    return { text, keyboard: MAIN_MENU.keyboard };
  } catch (e) {
    return { text: "Error fetching complaints. Please try again.", keyboard: MAIN_MENU.keyboard };
  }
};

/**
 * Main Grievance Flow Controller
 */
export const handleGrievanceFlow = async (chatId, text, message) => {
  // --- Handle menu shortcuts BEFORE checking verification ---
  if (text === '/start' || text === '🏫 Back to Menu') return MAIN_MENU;

  if (text === '💡 FAQ / Help') {
    return {
      text: "💡 *MSAJCE FAQ & Help*\n\n" +
            "• *Hostel Timings*: 6:00 AM – 8:30 PM\n" +
            "• *Bus Routes*: Ask the MSAJCE Assistant bot\n" +
            "• *Office Hours*: Mon–Fri, 9:00 AM – 4:30 PM\n" +
            "• *Exam Timetable*: Check msajce-edu.in\n" +
            "• *Complaint ID*: Use GRV-XXXX to track status\n\n" +
            "For any other help, tap 📞 Contact Administration.",
      keyboard: MAIN_MENU.keyboard
    };
  }

  if (text === '📞 Contact Administration') {
    return {
      text: "📞 *Administration Contacts*\n\n" +
            "• *College Office*: +91 99400 04500\n" +
            "• *Email*: msajce.office@gmail.com\n" +
            "• *Principal*: principal@msajce-edu.in\n" +
            "• *Address*: 34, Rajiv Gandhi Salai (OMR), Siruseri IT Park, Chennai – 603103",
      keyboard: MAIN_MENU.keyboard
    };
  }

  if (text === '🚨 Emergency Complaint') {
    return {
      text: "🚨 *Emergency Grievance*\n\nYour complaint will be *immediately escalated* to the Principal and Disciplinary Committee.\n\nPlease use *📝 Register Complaint* and select *Harassment / Misconduct* as the category.",
      keyboard: MAIN_MENU.keyboard
    };
  }

  if (text === '📋 My Complaints') {
    const user = await getOrCreateUser(chatId);
    if (!user.verified) return MAIN_MENU;
    return await listUserComplaints(chatId);
  }

  if (text === '🔍 Track Complaint') {
    await setCache(`track_state:${chatId}`, true);
    return {
      text: "🔍 *Track Your Complaint*\n\nEnter your Complaint ID (e.g., *GRV-2043*):",
      keyboard: { keyboard: [['🏠 Back to Menu']], resize_keyboard: true }
    };
  }

  // --- Check verification for complaint registration ---
  const user = await getOrCreateUser(chatId);
  if (!user) {
    return { text: "⚠️ Error accessing your profile. Please try /start again.", keyboard: MAIN_MENU.keyboard };
  }

  if (!user.verified) {
    return await handleVerificationFlow(chatId, text);
  }

  // Handle Register Complaint button
  if (text === '📝 Register Complaint') {
    const stateKey = `${COMPLAINT_STATE_PREFIX}${chatId}`;
    const newState = { step: 'asking_category' };
    await setCache(stateKey, newState);
    return {
      text: "📝 *New Complaint Registration*\n\nSelect a category:",
      keyboard: {
        keyboard: [
          ['Hostel Issues', 'Transport / Bus'],
          ['Mess / Food', 'Faculty Issues'],
          ['Infrastructure', 'WiFi / IT Issues'],
          ['Administration', 'Harassment / Misconduct'],
          ['Other', '❌ Cancel']
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    };
  }

  // --- Active complaint registration state machine ---
  const stateKey = `${COMPLAINT_STATE_PREFIX}${chatId}`;
  const state = await getCache(stateKey);

  if (!state) {
    return MAIN_MENU;
  }

  if (text === '❌ Cancel') {
    await setCache(stateKey, null);
    return { text: "❌ Complaint registration cancelled.", keyboard: MAIN_MENU.keyboard };
  }

  let nextState = { ...state };

  if (state.step === 'asking_category') {
    const categories = Object.keys(DEPT_ROUTING);
    if (!categories.includes(text)) return {
      text: "⚠️ Please select a valid category using the buttons below:",
      keyboard: {
        keyboard: [
          ['Hostel Issues', 'Transport / Bus'],
          ['Mess / Food', 'Faculty Issues'],
          ['Infrastructure', 'WiFi / IT Issues'],
          ['Administration', 'Harassment / Misconduct'],
          ['Other', '❌ Cancel']
        ],
        resize_keyboard: true
      }
    };

    nextState.category = text;
    nextState.step = 'asking_desc';
    await setCache(stateKey, nextState);
    return {
      text: `📂 Category: *${text}*\n\nPlease describe your issue in detail. Include:\n• Location / Date / Time\n• People involved\n• What happened`,
      keyboard: { keyboard: [['❌ Cancel']], resize_keyboard: true }
    };
  }

  if (state.step === 'asking_desc') {
    if (!text || text.length < 5) return { 
        text: "⚠️ Description too short. Please provide more details:", 
        keyboard: { keyboard: [['❌ Cancel']], resize_keyboard: true } 
    };
    nextState.description = text;
    nextState.step = 'asking_evidence';
    await setCache(stateKey, nextState);
    return {
      text: "📎 Would you like to attach *Evidence*?\n\n" +
            "• Send a **Photo**, **Document**, or **Video**\n" +
            "• Or tap **⏭️ Skip Evidence** to finish",
      keyboard: { keyboard: [['⏭️ Skip Evidence'], ['❌ Cancel']], resize_keyboard: true }
    };
  }

  if (state.step === 'asking_evidence') {
    let evidenceUrl = state.evidence_url || 'None';
    const isSkip = text === '⏭️ Skip Evidence';
    
    // Handle Media Upload
    if (message?.photo) {
      evidenceUrl = `tg_photo:${message.photo[message.photo.length - 1].file_id}`;
    } else if (message?.document) {
      evidenceUrl = `tg_doc:${message.document.file_id}`;
    } else if (message?.video) {
        evidenceUrl = `tg_video:${message.video.file_id}`;
    }

    // If it was a photo and not a "Skip" or "Cancel", we can either finish immediately or wait for more/confirmation
    // For simplicity, we finish now but prioritize the media if present.
    const grvId = await generateComplaintId();
    const dept = DEPT_ROUTING[nextState.category] || 'General Admin';

    // Guard against missing state
    if (!nextState.category || !nextState.description) {
        await setCache(stateKey, null);
        return { text: "⚠️ Session expired. Please start again.", keyboard: MAIN_MENU.keyboard };
    }

    const newComplaint = new Complaint({
      complaint_id: grvId,
      student_id: user._id,
      telegram_id: chatId,
      category: nextState.category,
      description: nextState.description,
      evidence_url: evidenceUrl,
      department_assigned: dept,
      is_emergency: nextState.category === 'Harassment / Misconduct'
    });

    await newComplaint.save();

    // Email alert (Gmail)
    try {
      await transporter.sendMail({
        from: '"MSAJCE Grievance Bot" <eventbooking.otp@gmail.com>',
        to: 'cookwithcomali5@gmail.com',
        subject: `[${nextState.category === 'Harassment / Misconduct' ? '🚨 URGENT' : 'NEW'}] Grievance ${grvId}`,
        html: `
          <div style="font-family: Arial; padding: 20px; border: 1px solid #ddd; border-top: 5px solid ${nextState.category === 'Harassment / Misconduct' ? '#d9534f' : '#337ab7'};">
            <h2 style="color: #333;">New Grievance Submitted</h2>
            <p><b>ID:</b> ${grvId}</p>
            <p><b>Category:</b> ${nextState.category}</p>
            <p><b>Severity:</b> ${nextState.category === 'Harassment / Misconduct' ? 'EMERGENCY' : 'Standard'}</p>
            <hr/>
            <p><b>Student Name:</b> ${user.name || 'N/A'}</p>
            <p><b>Reg No:</b> ${user.register_number || 'N/A'}</p>
            <p><b>Dept:</b> ${user.department} (Year ${user.year})</p>
            <hr/>
            <p><b>Description:</b></p>
            <div style="background: #f9f9f9; padding: 10px; border-radius: 5px;">${nextState.description}</div>
            <p><b>Evidence:</b> ${evidenceUrl !== 'None' ? 'Attached (View in Telegram)' : 'None'}</p>
            <p><b>Assigned To:</b> ${dept}</p>
            <p style="font-size: 12px; color: #777; margin-top: 20px;">This is an automated notification from the MSAJCE Grievance System.</p>
          </div>
        `
      });
      logger.info(`Email sent successfully for ${grvId}`);
    } catch (e) { 
      logger.error(`Email fail for ${grvId}: ${e.message}`); 
    }

    await setCache(stateKey, null);
    return {
      text: `✅ *Complaint Submitted Successfully!*\n\n` +
            `🆔 *Complaint ID:* \`${grvId}\`\n` +
            `📂 *Category:* ${nextState.category}\n` +
            `🏢 *Assigned To:* ${dept}\n` +
            `📊 *Status:* Submitted\n\n` +
            `You will be notified via Telegram when an administrator responds to your complaint.`,
      keyboard: MAIN_MENU.keyboard
    };
  }


  return MAIN_MENU;
};

/**
 * Tracks a complaint by ID
 */
export const trackComplaint = async (complaintId) => {
  try {
    const grv = await Complaint.findOne({ complaint_id: complaintId.toUpperCase().trim() });
    if (!grv) return {
      text: "❌ Complaint ID not found. Please check the ID and try again.\n\nFormat: *GRV-2043*",
      keyboard: MAIN_MENU.keyboard
    };

    const statusIcon = grv.status === 'resolved' ? '✅' : grv.status === 'in_progress' ? '🔄' : '⏳';
    return {
      text: `🔍 *Complaint Tracking*\n\n` +
            `🆔 *ID:* ${grv.complaint_id}\n` +
            `📂 *Category:* ${grv.category}\n` +
            `${statusIcon} *Status:* ${grv.status.toUpperCase()}\n` +
            `🏢 *Assigned To:* ${grv.department_assigned}\n` +
            `📅 *Submitted:* ${new Date(grv.created_at).toLocaleDateString('en-IN')}\n` +
            `🔄 *Updated:* ${new Date(grv.updated_at).toLocaleDateString('en-IN')}` +
            (grv.admin_response ? `\n\n💬 *Admin Response:* ${grv.admin_response}` : ''),
      keyboard: MAIN_MENU.keyboard
    };
  } catch (e) {
    return { text: "Error tracking complaint. Please try again.", keyboard: MAIN_MENU.keyboard };
  }
};
