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
const EMERGENCY_STATE_PREFIX = 'emg_state:';

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
  text: "🛡️ *MSAJCE Grievance Redressal Portal*\n\nEfficiently resolving your concerns through professional automation.\n\n_Select an option from the dashboard below:_ ",
  keyboard: {
    keyboard: [
      ['📝 Register Complaint', '🔍 Track Complaint'],
      ['🚨 Emergency Complaint', '📋 My History'],
      ['👤 My Profile', '💡 FAQ & Help']
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

const HELP_MESSAGE = {
  text: "📖 *MSAJCE Bot Help Guide*\n\n" +
        "• *Register Complaint*: Formal submission for any college issue.\n" +
        "• *Emergency*: High-priority safety/medical alerts.\n" +
        "• *Track*: Check status using your GRV-ID.\n" +
        "• *Profile*: Manage your registered academic details.\n\n" +
        "*Commands:*\n" +
        "/start - Reset to Main Menu\n" +
        "/cancel - Stop current process\n" +
        "/profile - View your details\n" +
        "/track - Alias for Tracking\n\n" +
        "For technical issues, contact @ramzendrum_zen",
  keyboard: MAIN_MENU.keyboard
};

const generateComplaintId = async () => {
  const count = await Complaint.countDocuments();
  return `GRV-${(count + 2043).toString().padStart(4, '0')}`;
};

const generateUserId = async () => {
  const count = await User.countDocuments({ verified: true });
  return `USR-${(count + 1001).toString()}`;
};

/**
 * REDESIGNED PROFESSIONAL EMAIL TEMPLATE
 */
const getProfessionalEmailTemplate = (grvId, user, state, dept, isEmergency = false) => {
    const accentColor = isEmergency ? '#ef4444' : '#3b82f6';
    const urgencyLabel = isEmergency ? 'CRITICAL EMERGENCY' : 'NORMAL COMPLAINT';
    const emergencyHeader = isEmergency ? `
        <div style="background-color: #ef4444; color: #ffffff; padding: 12px; text-align: center; font-weight: 900; font-size: 14px; letter-spacing: 3px; border-radius: 12px 12px 0 0;">
            🚨 PRIORITY: ${urgencyLabel}
        </div>
    ` : '';

    return `
    <div style="background-color: #f8fafc; color: #1e293b; font-family: 'Inter', -apple-system, sans-serif; padding: 40px 20px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #e2e8f0;">
            ${emergencyHeader}
            
            <div style="padding: 32px;">
                <div style="display: flex; align-items: center; margin-bottom: 24px;">
                    <div style="background: ${accentColor}; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin-right: 12px;">M</div>
                    <div style="font-weight: 800; font-size: 20px; letter-spacing: -0.5px; color: #0f172a;">MSAJCE <span style="color: ${accentColor};">ADMIN</span></div>
                </div>

                <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px;">
                    <div style="font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">Ticket ID</div>
                    <div style="font-size: 20px; font-weight: 800; color: ${accentColor}; font-family: 'JetBrains Mono', monospace;">${grvId}</div>
                </div>

                <div style="margin-bottom: 32px;">
                    <h2 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">${isEmergency ? state.incident_type : state.category}</h2>
                    <p style="font-size: 14px; color: #64748b; margin: 0;">Routed to: <strong style="color: #475569;">${dept}</strong></p>
                </div>

                <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 32px; border: 1px solid #f1f5f9;">
                    <h3 style="font-size: 11px; font-weight: 700; color: ${accentColor}; margin: 0 0 12px 0; text-transform: uppercase;">Issue Description</h3>
                    <div style="font-size: 15px; line-height: 1.6; color: #334155;">${state.description}</div>
                    ${isEmergency && state.location ? `
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px dotted #cbd5e1;">
                         <div style="font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 4px;">LOCATION</div>
                         <div style="font-size: 14px; color: #0f172a; font-weight: 600;">📍 ${state.location}</div>
                    </div>` : ''}
                </div>

                <div style="margin-bottom: 32px;">
                    <h3 style="font-size: 11px; font-weight: 700; color: #94a3b8; margin: 0 0 16px 0; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">Initiator Metadata</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; font-size: 13px; color: #64748b; font-weight: 500;">Name</td>
                            <td style="padding: 8px 0; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right;">${user.name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-size: 13px; color: #64748b; font-weight: 500;">College ID</td>
                            <td style="padding: 8px 0; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right;">${user.register_number || user.employee_id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-size: 13px; color: #64748b; font-weight: 500;">Department</td>
                            <td style="padding: 8px 0; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right;">${user.department}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-size: 13px; color: #64748b; font-weight: 500;">Role</td>
                            <td style="padding: 8px 0; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right;">${user.role.toUpperCase()}</td>
                        </tr>
                        ${user.phone ? `
                        <tr>
                            <td style="padding: 8px 0; font-size: 13px; color: #64748b; font-weight: 500;">Emergency Phone</td>
                            <td style="padding: 8px 0; font-size: 13px; color: #ef4444; font-weight: 800; text-align: right;">${user.phone}</td>
                        </tr>` : ''}
                    </table>
                </div>

                <div style="text-align: center;">
                    <a href="https://telebot-ram.vercel.app/admin" style="display: inline-block; background: #0f172a; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">Proceed to Review Ticket</a>
                </div>
            </div>

            <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;">
                <p style="font-size: 12px; color: #94a3b8; margin: 0; font-weight: 500;">Sent via MSAJCE Automated Grievance Oracle. Confidential.</p>
            </div>
        </div>
    </div>
    `;
};

/**
 * Handle Verification Flow for new users
 */
export const handleVerificationFlow = async (chatId, text, message) => {
  const stateKey = `${VERIFY_STATE_PREFIX}${chatId}`;
  const state = await getCache(stateKey);

  if (!state) {
    await setCache(stateKey, { step: 'asking_role' });
    return { 
      text: "👋 *Account Registration Needed*\n\nTo ensure privacy and accountability, please register your profile.\n\nChoose your role:",
      keyboard: { keyboard: [['Student', 'Staff'], ['❌ Cancel Registration']], resize_keyboard: true }
    };
  }

  if (text === '❌ Cancel Registration' || text === '/cancel') {
    await setCache(stateKey, null);
    return { text: "❌ Registration cancelled.", keyboard: MAIN_MENU.keyboard };
  }

  let nextState = { ...state };

  if (state.step === 'asking_role') {
    if (!['Student', 'Staff'].includes(text)) return { text: "⚠️ Please use the buttons to select your role." };
    nextState.role = text.toLowerCase();
    nextState.step = nextState.role === 'student' ? 'asking_reg' : 'asking_emp_id';
    await setCache(stateKey, nextState);
    return { 
      text: nextState.role === 'student' ? "🆔 Please enter your *University Register Number*:" : "🆔 Please enter your *Staff ID Number*:",
      keyboard: { keyboard: [['❌ Cancel Registration']], resize_keyboard: true } 
    };
  }

  if (state.step === 'asking_reg' || state.step === 'asking_emp_id') {
    const idVal = text.trim().toUpperCase();
    const query = state.role === 'student' ? { register_number: idVal } : { employee_id: idVal };
    const existing = await User.findOne(query);
    if (existing) return { text: "⚠️ This ID is already registered from another account." };
    
    if (state.role === 'student') nextState.register_number = idVal;
    else nextState.employee_id = idVal;
    
    nextState.step = 'asking_name';
    await setCache(stateKey, nextState);
    return { text: "👤 Please enter your *Full Name* (as per college records):" };
  }

  if (state.step === 'asking_name') {
    nextState.name = text;
    nextState.step = 'asking_dept';
    await setCache(stateKey, nextState);
    return { 
      text: "🏢 Select your *Department*:", 
      keyboard: { keyboard: [['CSE', 'ECE'], ['EEE', 'Mech'], ['IT', 'Civil'], ['Artificial Intelligence', 'Cyber Security'], ['❌ Cancel Registration']], resize_keyboard: true } 
    };
  }

  if (state.step === 'asking_dept') {
    nextState.department = text;
    if (state.role === 'student') {
        nextState.step = 'asking_year';
        await setCache(stateKey, nextState);
        return { 
          text: "📅 Which *Year* of study are you in?", 
          keyboard: { keyboard: [['1', '2'], ['3', '4'], ['❌ Cancel Registration']], resize_keyboard: true } 
        };
    } else {
        nextState.step = 'asking_designation';
        await setCache(stateKey, nextState);
        return { text: "💼 Enter your *Designation* (e.g. Professor, HOD):" };
    }
  }

  if (state.step === 'asking_year') {
    nextState.year = parseInt(text);
    nextState.step = 'asking_residence';
    await setCache(stateKey, nextState);
    return { 
        text: "🏠 Are you a *Hosteller* or *Day Scholar*?", 
        keyboard: { keyboard: [['Hostel', 'Day Scholar'], ['❌ Cancel Registration']], resize_keyboard: true } 
    };
  }

  if (state.step === 'asking_designation') {
    nextState.designation = text;
    nextState.step = 'asking_phone';
    await setCache(stateKey, nextState);
    return { text: "📞 Enter your *Mobile Number* for urgent contact:" };
  }

  if (state.step === 'asking_residence') {
    nextState.residence_type = text;
    if (text === 'Hostel') {
        nextState.step = 'asking_room';
        await setCache(stateKey, nextState);
        return { text: "🔑 Enter your *Room Number* (e.g., H2-302):" };
    } else {
        nextState.step = 'asking_phone';
        await setCache(stateKey, nextState);
        return { text: "📞 Enter your *Mobile Number* for contact:" };
    }
  }

  if (state.step === 'asking_room') {
    nextState.room_number = text;
    nextState.step = 'asking_phone';
    await setCache(stateKey, nextState);
    return { text: "📞 Finally, enter your *Mobile Number*:" };
  }

  if (state.step === 'asking_phone') {
    nextState.phone = text;
    const usrId = await generateUserId();
    const finalData = { ...nextState, user_id: usrId, verified: true };
    delete finalData.step;

    await verifyUser(chatId, finalData);
    await setCache(stateKey, null);

    return { 
      text: `✅ *Registration Complete!*\n\n*User ID:* \`${usrId}\`\n*Profile:* ${nextState.name}\n\nYou can now use all portal features.`,
      keyboard: MAIN_MENU.keyboard 
    };
  }

  return MAIN_MENU;
};

/**
 * EMERGENCY COMPLAINT FLOW
 */
export const handleEmergencyFlow = async (chatId, text, message) => {
    const stateKey = `${EMERGENCY_STATE_PREFIX}${chatId}`;
    const state = await getCache(stateKey);

    if (text === '❌ Cancel' || text === '/cancel') {
        await setCache(stateKey, null);
        return { text: "🚨 Emergency flow cancelled.", keyboard: MAIN_MENU.keyboard };
    }

    if (!state) {
        await setCache(stateKey, { step: 'asking_type' });
        return {
            text: "🚨 *EMERGENCY ALERT SYSTEM*\n\nThis will trigger an immediate high-priority notification to the principal and security team.\n\n*Select Incident Type:*",
            keyboard: { 
                keyboard: [['Medical Emergency', 'Harassment'], ['Theft / Fight', 'Fire / Safety'], ['❌ Cancel']], 
                resize_keyboard: true 
            }
        };
    }

    let nextState = { ...state };

    if (state.step === 'asking_type') {
        if (text === '❌ Cancel') { await setCache(stateKey, null); return MAIN_MENU; }
        nextState.incident_type = text;
        nextState.step = 'asking_loc';
        await setCache(stateKey, nextState);
        return { text: "📍 Please specify the *Location* (e.g., C-Block 2nd Floor, Main Mess):" };
    }

    if (state.step === 'asking_loc') {
        nextState.location = text;
        nextState.step = 'asking_desc';
        await setCache(stateKey, nextState);
        return { text: "ℹ️ Summarize the *Incident* (Keep it brief but clear):" };
    }

    if (state.step === 'asking_desc') {
        const user = await User.findOne({ telegram_id: chatId });
        const grvId = await generateComplaintId();
        
        const newComplaint = new Complaint({
            complaint_id: grvId,
            student_id: user._id,
            telegram_id: chatId,
            category: 'Harassment / Misconduct',
            incident_type: state.incident_type,
            location: state.location,
            description: text,
            is_emergency: true,
            status: 'submitted',
            department_assigned: 'Principal / Security Team'
        });
        await newComplaint.save();

        // Send High Priority Email
        try {
            await transporter.sendMail({
                from: '"🚨 MSAJCE EMERGENCY" <eventbooking.otp@gmail.com>',
                to: 'cookwithcomali5@gmail.com',
                subject: `⛔ [EMERGENCY] ${state.incident_type} at ${state.location}`,
                html: getProfessionalEmailTemplate(grvId, user, { ...state, description: text }, 'Principal / Security Team', true)
            });
        } catch (e) { logger.error(`Emergency Email Fail: ${e.message}`); }

        await setCache(stateKey, null);
        return {
            text: `🚨 *EMERGENCY NOTIFIED*\n\nYour alert has been broadcasted to the top administration with ID: \`${grvId}\`.\n\n*Stay Calm.* Help is being dispatched.`,
            keyboard: MAIN_MENU.keyboard
        };
    }
};

/**
 * MAIN ENTRY POINT FOR GRIEVANCE BOT
 */
export const handleGrievanceFlow = async (chatId, text, message) => {
  // Command Routing
  if (text === '/start' || text === '🏠 Back to Menu' || text === '🏫 Back to Menu') return MAIN_MENU;
  if (text === '/help' || text === '💡 FAQ & Help') return HELP_MESSAGE;
  if (text === '/cancel' || text === '❌ Cancel') {
      await setCache(`${COMPLAINT_STATE_PREFIX}${chatId}`, null);
      await setCache(`${EMERGENCY_STATE_PREFIX}${chatId}`, null);
      await setCache(`${VERIFY_STATE_PREFIX}${chatId}`, null);
      return { text: "🏁 Process terminated. Returning to menu.", keyboard: MAIN_MENU.keyboard };
  }

  const user = await getOrCreateUser(chatId, message);
  if (!user) return { text: "⚠️ Database connection error." };

  if (text === '/profile' || text === '👤 My Profile') {
      const p = user;
      let profileText = `👤 *Your Profile*\n\n` +
          `*Name:* ${p.name}\n` +
          `*Role:* ${p.role.toUpperCase()}\n` +
          `*Dept:* ${p.department}\n` +
          `*ID:* ${p.register_number || p.employee_id}\n` +
          `*Contact:* ${p.phone || 'N/A'}\n` +
          `*Verification:* ${p.verified ? '✅ Verified' : '❌ Pending'}`;
      return { text: profileText, keyboard: MAIN_MENU.keyboard };
  }

  if (text === '/history' || text === '📋 My History') {
      const history = await Complaint.find({ telegram_id: chatId }).sort({ created_at: -1 }).limit(5);
      if (history.length === 0) return { text: "📜 You haven't registered any complaints yet." };
      let logs = "📜 *Recent Complaints history:*\n\n";
      history.forEach(c => logs += `• \`${c.complaint_id}\` - ${c.status}\n  (${c.category})\n\n`);
      return { text: logs, keyboard: MAIN_MENU.keyboard };
  }

  // Check Registration Requirement
  if (!user.verified) return await handleVerificationFlow(chatId, text, message);

  // Check Emergency Requirement
  const emgState = await getCache(`${EMERGENCY_STATE_PREFIX}${chatId}`);
  if (text === '🚨 Emergency Complaint' || emgState) return await handleEmergencyFlow(chatId, text, message);

  // Normal Grievance Flow
  const stateKey = `${COMPLAINT_STATE_PREFIX}${chatId}`;
  const state = await getCache(stateKey);

  if (text === '📝 Register Complaint') {
    await setCache(stateKey, { step: 'asking_category' });
    return {
      text: "📂 *Select Concern Category:*\n\nChoose the area that best describes your issue.",
      keyboard: {
        keyboard: [
          ['Hostel Issues', 'Transport / Bus'],
          ['Mess / Food', 'Faculty Issues'],
          ['WiFi / IT Issues', 'Infrastructure'],
          ['Fee / Scholarship', 'Academic Marks'],
          ['Cleanliness', 'Other Issues'],
          ['❌ Cancel']
        ],
        resize_keyboard: true
      }
    };
  }

  if (!state) return MAIN_MENU;

  let nextState = { ...state };

  if (state.step === 'asking_category') {
    nextState.category = text;
    nextState.step = 'asking_desc';
    await setCache(stateKey, nextState);
    return { 
        text: `📝 *${text}*\n\nPlease provide a detailed description of the issue. Be specific to help the admin resolve it faster.`, 
        keyboard: { keyboard: [['❌ Cancel']], resize_keyboard: true } 
    };
  }

  if (state.step === 'asking_desc') {
    nextState.description = text;
    nextState.step = 'asking_evidence';
    await setCache(stateKey, nextState);
    return {
      text: "📎 *Proof / Evidence*\n\nWould you like to attach a photo as evidence? Recommended for faster verification.",
      keyboard: { keyboard: [['⏭️ Skip Proof'], ['❌ Cancel']], resize_keyboard: true }
    };
  }

  if (state.step === 'asking_evidence') {
    const isSkip = text === '⏭️ Skip Proof';
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

            if (config.cloudinary.cloudName) {
                const res = await uploadTelegramMedia(token, media.file_id);
                evidenceUrl = res?.url;
            }
        }
      } catch (e) { logger.error(`Media Error: ${e.message}`); }
    }

    const newComplaint = new Complaint({
      complaint_id: grvId,
      student_id: user._id,
      telegram_id: chatId,
      category: state.category,
      description: state.description,
      evidence_url: evidenceUrl,
      department_assigned: dept
    });
    await newComplaint.save();

    // Send Professional Email
    try {
      await transporter.sendMail({
        from: '"MSAJCE Grievance Oracle" <eventbooking.otp@gmail.com>',
        to: 'cookwithcomali5@gmail.com',
        subject: `[TICKET] ${grvId} - ${state.category}`,
        html: getProfessionalEmailTemplate(grvId, user, state, dept, false),
        attachments: attachments
      });
    } catch (e) { logger.error(`Email Error: ${e.message}`); }

    await setCache(stateKey, null);
    return { 
      text: `🚀 *Submission Secured!*\n\nYour grievance has been logged as ID: \`${grvId}\`.\n\n*Next Steps:* The ${dept} has been notified. You will receive an update once it is reviewed.`,
      keyboard: MAIN_MENU.keyboard 
    };
  }

  return MAIN_MENU;
};

export const trackComplaint = async (id) => {
  const grv = await Complaint.findOne({ complaint_id: id.toUpperCase().trim() });
  if (!grv) return { text: "❌ *Invalid Ticket ID.*\n\nPlease check the ID and try again." };
  
  let statusText = `🔍 *Status Review: ${grv.complaint_id}*\n\n` +
      `📅 *Filed:* ${new Date(grv.created_at).toLocaleDateString()}\n` +
      `📁 *Category:* ${grv.category}\n` +
      `📊 *Current Status:* ${grv.status.replace('_', ' ').toUpperCase()}\n` +
      `🏢 *Assigned To:* ${grv.department_assigned}\n\n`;
  
  if (grv.admin_response) statusText += `💬 *Admin Note:* ${grv.admin_response}`;
  
  return { text: statusText, keyboard: MAIN_MENU.keyboard };
};
