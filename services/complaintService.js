import { getCache, setCache } from './cacheService.js';
import Complaint from '../database/models/Complaint.js';
import User from '../database/models/User.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';
import nodemailer from 'nodemailer';
import { getOrCreateUser, verifyUser } from './userService.js';
import { uploadTelegramMedia } from '../utils/cloudinary.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.email.user,
    pass: config.email.pass
  }
});

const COMPLAINT_STATE_PREFIX = 'grv_state:';
const VERIFY_STATE_PREFIX = 'verify_state:';

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

const generateComplaintId = async () => {
  const count = await Complaint.countDocuments();
  return `GRV-${(count + 2043).toString().padStart(4, '0')}`;
};

export const handleVerificationFlow = async (chatId, text) => {
  const stateKey = `${VERIFY_STATE_PREFIX}${chatId}`;
  const state = await getCache(stateKey);

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
  if (state.step === 'asking_reg') {
    nextState.register_number = text;
    nextState.step = 'asking_name';
    await setCache(stateKey, nextState);
    return { text: "✅ Register number saved!\n\nNow enter your *Full Name*:", keyboard: { keyboard: [['❌ Cancel']], resize_keyboard: true } };
  } else if (state.step === 'asking_name') {
    nextState.name = text;
    nextState.step = 'asking_dept';
    await setCache(stateKey, nextState);
    return { 
      text: "Now enter your *Department*:", 
      keyboard: { keyboard: [['CSE', 'ECE'], ['EEE', 'Mech'], ['IT', 'Civil'], ['❌ Cancel']], resize_keyboard: true } 
    };
  } else if (state.step === 'asking_dept') {
    nextState.department = text;
    nextState.step = 'asking_year';
    await setCache(stateKey, nextState);
    return { 
      text: "Enter your *Year of Study*:", 
      keyboard: { keyboard: [['1st Year', '2nd Year'], ['3rd Year', '4th Year'], ['❌ Cancel']], resize_keyboard: true } 
    };
  } else if (state.step === 'asking_year') {
    const yearMap = { '1st Year': 1, '2nd Year': 2, '3rd Year': 3, '4th Year': 4 };
    const year = yearMap[text] || parseInt(text);
    if (!year) return { text: "⚠️ Invalid! Use buttons.", keyboard: { keyboard: [['1st Year', '2nd Year'], ['3rd Year', '4th Year']], resize_keyboard: true } };
    
    await verifyUser(chatId, { register_number: state.register_number, name: state.name, department: state.department, year });
    await setCache(stateKey, null);
    return { text: `✅ *Verified!*\n\nWelcome, *${state.name}*!`, keyboard: MAIN_MENU.keyboard };
  }
};

export const listUserComplaints = async (chatId) => {
  const complaints = await Complaint.find({ telegram_id: chatId }).sort({ created_at: -1 }).limit(5);
  if (complaints.length === 0) return { text: "📋 No complaints yet.", keyboard: MAIN_MENU.keyboard };
  let text = "📋 *Your Recent Complaints*\n\n";
  complaints.forEach((c, i) => {
    const icon = c.status === 'resolved' ? '✅' : '⏳';
    text += `${i + 1}. *${c.complaint_id}* ${icon}\n   • Cat: ${c.category}\n\n`;
  });
  return { text, keyboard: MAIN_MENU.keyboard };
};

export const handleGrievanceFlow = async (chatId, text, message) => {
  if (text === '/start' || text === '🏫 Back to Menu') return MAIN_MENU;
  if (text === '💡 FAQ / Help') return { text: "💡 *Help Center*\n\nContact admin for deep issues.", keyboard: MAIN_MENU.keyboard };
  if (text === '📞 Contact Administration') return { text: "📞 Office: +91 99400 04500", keyboard: MAIN_MENU.keyboard };
  
  const user = await getOrCreateUser(chatId);
  if (!user) return { text: "⚠️ Error accessing profile.", keyboard: MAIN_MENU.keyboard };
  if (!user.verified) return await handleVerificationFlow(chatId, text);

  if (text === '📋 My Complaints') return await listUserComplaints(chatId);
  if (text === '🔍 Track Complaint') {
    await setCache(`track_state:${chatId}`, true);
    return { text: "🔍 Enter Complaint ID:", keyboard: { keyboard: [['🏫 Back to Menu']], resize_keyboard: true } };
  }

  // State Machine
  const stateKey = `${COMPLAINT_STATE_PREFIX}${chatId}`;
  const state = await getCache(stateKey);

  if (text === '📝 Register Complaint') {
    await setCache(stateKey, { step: 'asking_category' });
    return {
      text: "📝 *Select Category*:",
      keyboard: {
        keyboard: [['Hostel Issues', 'Transport / Bus'], ['Mess / Food', 'Faculty Issues'], ['Other', '❌ Cancel']],
        resize_keyboard: true
      }
    };
  }

  if (!state) return MAIN_MENU;
  if (text === '❌ Cancel') { await setCache(stateKey, null); return { text: "❌ Cancelled.", keyboard: MAIN_MENU.keyboard }; }

  let nextState = { ...state };

  if (state.step === 'asking_category') {
    nextState.category = text;
    nextState.step = 'asking_desc';
    await setCache(stateKey, nextState);
    return { text: `📂 *${text}*\n\nDescribe your issue:`, keyboard: { keyboard: [['❌ Cancel']], resize_keyboard: true } };
  }

  if (state.step === 'asking_desc') {
    nextState.description = text;
    nextState.step = 'asking_evidence';
    await setCache(stateKey, nextState);
    return {
      text: "📎 Attach *Evidence* (Photo) or tap Skip:",
      keyboard: { keyboard: [['⏭️ Skip Evidence'], ['❌ Cancel']], resize_keyboard: true }
    };
  }

  if (state.step === 'asking_evidence') {
    const isSkip = text === '⏭️ Skip Evidence';
    let evidenceUrl = 'None';
    
    const media = message?.photo?.[message.photo.length-1] || message?.document || message?.video;
    if (media && !isSkip) {
      const token = config.telegram.complaintBotToken || config.telegram.token;
      const res = await uploadTelegramMedia(token, media.file_id);
      evidenceUrl = res?.url || `tg_file:${media.file_id}`;
    }

    const grvId = await generateComplaintId();
    const dept = DEPT_ROUTING[state.category] || 'General Admin';

    const newComplaint = new Complaint({
      complaint_id: grvId,
      student_id: user._id,
      telegram_id: chatId,
      category: state.category,
      description: state.description,
      evidence_url: evidenceUrl,
      department_assigned: dept,
      is_emergency: state.category === 'Harassment / Misconduct'
    });
    await newComplaint.save();

    try {
      await transporter.sendMail({
        from: '"MSAJCE Grievance" <eventbooking.otp@gmail.com>',
        to: 'cookwithcomali5@gmail.com',
        subject: `[NEW] Grievance ${grvId}`,
        html: `<b>ID:</b> ${grvId}<br/><b>Student:</b> ${user.name}<br/><b>Desc:</b> ${state.description}<br/><br/><img src="${evidenceUrl}" width="300"/>`
      });
    } catch (e) { logger.error(`Mail Error: ${e.message}`); }

    await setCache(stateKey, null);
    return { text: `✅ *Submitted!*\n\nID: \`${grvId}\``, keyboard: MAIN_MENU.keyboard };
  }

  return MAIN_MENU;
};

export const trackComplaint = async (id) => {
  const grv = await Complaint.findOne({ complaint_id: id.toUpperCase().trim() });
  if (!grv) return { text: "❌ Not found.", keyboard: MAIN_MENU.keyboard };
  return { text: `🔍 *ID:* ${grv.complaint_id}\n*Status:* ${grv.status.toUpperCase()}\n*Dept:* ${grv.department_assigned}`, keyboard: MAIN_MENU.keyboard };
};
