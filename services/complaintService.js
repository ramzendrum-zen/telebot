import { getCache, setCache } from './cacheService.js';
import Complaint from '../database/models/Complaint.js';
import User from '../database/models/User.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';
import nodemailer from 'nodemailer';
import axios from 'axios';
import path from 'path';
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
  'Library Issues': 'Librarian',
  'Sports / Gym': 'Physical Director',
  'Placement / Training': 'Placement Officer',
  'Fee / Scholarship': 'Accounts Office',
  'Certificate / Document': 'Exam Cell',
  'Cleanliness / Hygiene': 'Maintenance Team',
  'Lab Equipment': 'Lab In-charge',
  'Marks / Attendance': 'HOD Department',
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

const generateUserId = async () => {
  const count = await User.countDocuments({ verified: true });
  return `USR-${(count + 1001).toString()}`;
};

export const handleVerificationFlow = async (chatId, text, message) => {
  const stateKey = `${VERIFY_STATE_PREFIX}${chatId}`;
  const state = await getCache(stateKey);

  if (!state) {
    await setCache(stateKey, { step: 'asking_role' });
    return { 
      text: "👋 *Welcome to MSAJCE Grievance Bot*\n\nTo ensure a secure and authenticated environment, please verify your identity.\n\nAre you a:",
      keyboard: { keyboard: [['Student', 'Staff'], ['❌ Cancel']], resize_keyboard: true }
    };
  }

  if (text === '❌ Cancel' || text === '🏫 Back to Menu') {
    await setCache(stateKey, null);
    return MAIN_MENU;
  }

  let nextState = { ...state };

  // 1. Role Selection
  if (state.step === 'asking_role') {
    if (!['Student', 'Staff'].includes(text)) return { text: "⚠️ Please select from the menu.", keyboard: { keyboard: [['Student', 'Staff'], ['❌ Cancel']], resize_keyboard: true } };
    nextState.role = text.toLowerCase();
    nextState.step = nextState.role === 'student' ? 'asking_reg' : 'asking_emp_id';
    await setCache(stateKey, nextState);
    return { 
      text: nextState.role === 'student' ? "🆔 Please enter your *Register Number* (e.g., 22IT045):" : "🆔 Please enter your *Employee ID* (e.g., EMP102):",
      keyboard: { keyboard: [['❌ Cancel']], resize_keyboard: true } 
    };
  }

  // 2. ID Collection (Reg Num or Emp ID)
  if (state.step === 'asking_reg' || state.step === 'asking_emp_id') {
    if (state.role === 'student') {
        const existing = await User.findOne({ register_number: text.trim().toUpperCase() });
        if (existing) return { text: "⚠️ This Register Number is already linked to another account." };
        nextState.register_number = text.trim().toUpperCase();
    } else {
        const existing = await User.findOne({ employee_id: text.trim().toUpperCase() });
        if (existing) return { text: "⚠️ This Employee ID is already linked to another account." };
        nextState.employee_id = text.trim().toUpperCase();
    }
    nextState.step = 'asking_name';
    await setCache(stateKey, nextState);
    return { text: "👤 Enter your *Full Name*:", keyboard: { keyboard: [['❌ Cancel']], resize_keyboard: true } };
  }

  // 3. Name Collection
  if (state.step === 'asking_name') {
    nextState.name = text;
    nextState.step = 'asking_dept';
    await setCache(stateKey, nextState);
    return { 
      text: "🏢 Enter your *Department*:", 
      keyboard: { keyboard: [['CSE', 'ECE'], ['EEE', 'Mech'], ['IT', 'Civil'], ['Artificial Intelligence', 'Cyber Security'], ['❌ Cancel']], resize_keyboard: true } 
    };
  }

  // 4. Dept Collection -> Student (Year) / Staff (Designation)
  if (state.step === 'asking_dept') {
    nextState.department = text;
    if (state.role === 'student') {
        nextState.step = 'asking_year';
        await setCache(stateKey, nextState);
        return { 
          text: "📅 Enter your *Year of Study*:", 
          keyboard: { keyboard: [['1', '2'], ['3', '4'], ['❌ Cancel']], resize_keyboard: true } 
        };
    } else {
        nextState.step = 'asking_designation';
        await setCache(stateKey, nextState);
        return { text: "💼 Enter your *Designation* (e.g., Assistant Professor):" };
    }
  }

  // 5a. Student Year -> Residence Type
  if (state.step === 'asking_year') {
    nextState.year = parseInt(text);
    if (isNaN(nextState.year)) return { text: "⚠️ Please use the buttons for Year." };
    nextState.step = 'asking_residence';
    await setCache(stateKey, nextState);
    return { 
        text: "🏠 Are you a:", 
        keyboard: { keyboard: [['Hostel', 'Day Scholar'], ['❌ Cancel']], resize_keyboard: true } 
    };
  }

  // 5b. Staff Designation -> Phone
  if (state.step === 'asking_designation') {
    nextState.designation = text;
    nextState.step = 'asking_phone';
    await setCache(stateKey, nextState);
    return { text: "📞 Finally, enter your *Phone Number* (Optional, type Skip):", keyboard: { keyboard: [['Skip'], ['❌ Cancel']], resize_keyboard: true } };
  }

  // 6a. Residence Type -> Room No or Phone
  if (state.step === 'asking_residence') {
    nextState.residence_type = text;
    if (text === 'Hostel') {
        nextState.step = 'asking_room';
        await setCache(stateKey, nextState);
        return { text: "🔑 Enter your *Room Number* (e.g., H2-104):" };
    } else {
        nextState.step = 'asking_phone';
        await setCache(stateKey, nextState);
        return { text: "📞 Enter your *Phone Number* (Optional, type Skip):", keyboard: { keyboard: [['Skip'], ['❌ Cancel']], resize_keyboard: true } };
    }
  }

  // 6b. Room No -> Phone
  if (state.step === 'asking_room') {
    nextState.room_number = text;
    nextState.step = 'asking_phone';
    await setCache(stateKey, nextState);
    return { text: "📞 Enter your *Phone Number* (Optional, type Skip):", keyboard: { keyboard: [['Skip'], ['❌ Cancel']], resize_keyboard: true } };
  }

  // Final Step: Phone & Verification
  if (state.step === 'asking_phone') {
    if (text.toLowerCase() !== 'skip') nextState.phone = text;
    
    const usrId = await generateUserId();
    const finalData = {
        user_id: usrId,
        role: nextState.role,
        register_number: nextState.register_number,
        employee_id: nextState.employee_id,
        name: nextState.name,
        department: nextState.department,
        year: nextState.year,
        residence_type: nextState.residence_type,
        room_number: nextState.room_number,
        designation: nextState.designation,
        phone: nextState.phone,
        verified: true
    };

    await verifyUser(chatId, finalData);
    await setCache(stateKey, null);

    return { 
      text: `🎉 *Registration Successful!*\n\n*Name:* ${nextState.name}\n*Role:* ${nextState.role.toUpperCase()}\n*User ID:* \`${usrId}\`\n\nYou can now register complaints.`,
      keyboard: MAIN_MENU.keyboard 
    };
  }

  return MAIN_MENU;
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
  
  const user = await getOrCreateUser(chatId, message);
  if (!user) return { text: "⚠️ Error accessing profile.", keyboard: MAIN_MENU.keyboard };
  if (!user.verified) return await handleVerificationFlow(chatId, text, message);

  if (text === '📋 My Complaints') return await listUserComplaints(chatId);
  if (text === '🔍 Track Complaint') {
    await setCache(`track_state:${chatId}`, true);
    return { text: "🔍 Enter Complaint ID:", keyboard: { keyboard: [['🏫 Back to Menu']], resize_keyboard: true } };
  }

  const stateKey = `${COMPLAINT_STATE_PREFIX}${chatId}`;
  const state = await getCache(stateKey);

  if (text === '📝 Register Complaint') {
    await setCache(stateKey, { step: 'asking_category' });
    return {
      text: "📝 *Select Category*:",
      keyboard: {
        keyboard: [
          ['Hostel Issues', 'Transport / Bus'],
          ['Mess / Food', 'Faculty Issues'],
          ['WiFi / IT Issues', 'Infrastructure'],
          ['Library Issues', 'Sports / Gym'],
          ['Placement / Training', 'Fee / Scholarship'],
          ['Certificate / Document', 'Cleanliness / Hygiene'],
          ['Lab Equipment', 'Marks / Attendance'],
          ['Harassment / Misconduct', 'Other'],
          ['❌ Cancel']
        ],
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
    const grvId = await generateComplaintId();
    const dept = DEPT_ROUTING[state.category] || 'General Admin';

    let attachments = [];
    let evidenceUrl = 'None';
    
    // Process Media
    const media = message?.photo?.[message.photo.length-1] || message?.document || message?.video;
    if (media && !isSkip) {
      try {
        const token = config.telegram.complaintBotToken || config.telegram.token;
        const fileInfo = await axios.get(`https://api.telegram.org/bot${token}/getFile?file_id=${media.file_id}`);
        const filePath = fileInfo.data?.result?.file_path;
        if (filePath) {
            const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
            const fileResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
            attachments.push({
                filename: `evidence_${grvId}${path.extname(filePath) || '.jpg'}`,
                content: Buffer.from(fileResponse.data)
            });

            // Cloudinary Fallback
            if (config.cloudinary.cloudName) {
                const res = await uploadTelegramMedia(token, media.file_id);
                evidenceUrl = res?.url || `tg_file:${media.file_id}`;
            } else {
                evidenceUrl = `tg_file:${media.file_id}`;
            }
        }
      } catch (e) {
        logger.error(`Media processing failed: ${e.message}`);
      }
    }

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
        from: '"MSAJCE Grievance System" <eventbooking.otp@gmail.com>',
        to: 'cookwithcomali5@gmail.com',
        subject: `[NEW] Grievance ${grvId} - ${state.category}`,
        html: `
            <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px;">
                <h2>New Grievance: ${grvId}</h2>
                <p><b>Category:</b> ${state.category}</p>
                <p><b>Student:</b> ${user.name} (${user.register_number || user.employee_id})</p>
                <p><b>Department:</b> ${user.department}</p>
                <p><b>Role:</b> ${user.role.toUpperCase()}</p>
                <hr/>
                <p><b>Issue Description:</b></p>
                <div style="background: #f9f9f9; padding: 10px;">${state.description}</div>
                <hr/>
                <p><i>The media evidence is attached to this email.</i></p>
            </div>
        `,
        attachments: attachments
      });
    } catch (e) { logger.error(`Email Error: ${e.message}`); }

    await setCache(stateKey, null);
    return { 
      text: `✅ *Grievance Submitted!* \n\nID: \`${grvId}\` \n\nThe administration (assigned to *${dept}*) has been notified with your evidence via email.`,
      keyboard: MAIN_MENU.keyboard 
    };
  }

  return MAIN_MENU;
};

export const trackComplaint = async (id) => {
  const grv = await Complaint.findOne({ complaint_id: id.toUpperCase().trim() });
  if (!grv) return { text: "❌ Not found.", keyboard: MAIN_MENU.keyboard };
  return { text: `🔍 *ID:* ${grv.complaint_id}\n*Status:* ${grv.status.toUpperCase()}\n*Dept:* ${grv.department_assigned}`, keyboard: MAIN_MENU.keyboard };
};
