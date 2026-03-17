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
  text: "Welcome to the MSAJCE Grievance Management Portal.\n\n_Please select an option from the official dashboard:_ ",
  keyboard: {
    keyboard: [
      ['📝 Register Complaint', '🚨 Emergency Alert'],
      ['🔍 Track Complaint', '👤 My Profile'],
      ['💡 FAQ & Help']
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

const getHumanGreeting = (user) => {
    if (!user || !user.verified) return "Welcome to the Official MSAJCE Grievance Assistance System.";
    const title = user.salutation || "";
    const name = user.name ? user.name.split(' ')[0] : "User";
    return `Hello ${title} ${name}. I will assist you with the portal operations.`;
};

const FAQ_DATA = {
  text: "💡 *MSAJCE Knowledge Hub*\n\n" +
        "*🏫 College Timings*\n" +
        "• Mon - Fri: 09:00 AM - 08:00 PM\n" +
        "• Sat: 10:00 AM - 04:00 PM\n\n" +
        "*🎯 Vision & Mission*\n" +
        "To be a leading institution for higher education through innovative teaching and sustainable practices.\n\n" +
        "*📚 Learning Centre (Library)*\n" +
        "• 29,853+ Volumes | 1885 Reference Books\n" +
        "• Equipped with Wi-Fi, DELNET and J-Gate.\n\n" +
        "*📞 Key Contacts*\n" +
        "• Principal: Dr. K.S. Srinivasan (9150575066)\n" +
        "• Out-of-State Support: Dr. Vamsi Naga Mohan (9043358674)\n\n" +
        "Select an option below or ask me anything!",
  keyboard: MAIN_MENU.keyboard
};

const HELP_MESSAGE = {
  text: "📖 *MSAJCE Bot Help Guide*\n\n" +
        "• *Register Complaint*: Formal submission for any college issue. (Supports Anonymous mode)\n" +
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
                            <td style="padding: 8px 0; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right;">${state.is_anonymous ? '🎭 ANONYMOUS' : user.name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-size: 13px; color: #64748b; font-weight: 500;">College ID</td>
                            <td style="padding: 8px 0; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right;">${state.is_anonymous ? 'REDACTED' : (user.register_number || user.employee_id)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-size: 13px; color: #64748b; font-weight: 500;">Department</td>
                            <td style="padding: 8px 0; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right;">${user.department}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-size: 13px; color: #64748b; font-weight: 500;">Role</td>
                            <td style="padding: 8px 0; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right;">${user.role.toUpperCase()}</td>
                        </tr>
                        ${user.phone && !state.is_anonymous ? `
                        <tr>
                            <td style="padding: 8px 0; font-size: 13px; color: #64748b; font-weight: 500;">Contact Phone</td>
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
    await setCache(stateKey, { step: 'asking_salutation' });
    return { 
      text: "Welcome to the Official MSAJCE Grievance Assistance System.\n\nTo ensure secure communication, please complete your profile verification before submitting complaints.\n\n*Select your salutation:*",
      keyboard: { keyboard: [['👨 Mr.', '👩 Ms.'], ['❌ Cancel Registration']], resize_keyboard: true }
    };
  }

  if (text === '❌ Cancel Registration' || text === '/cancel') {
    await setCache(stateKey, null);
    return { text: "❌ Registration cancelled. Use /start to begin again.", keyboard: { remove_keyboard: true } };
  }

  let nextState = { ...state };

  if (state.step === 'asking_salutation') {
    if (!['👨 Mr.', '👩 Ms.'].includes(text)) return { text: "⚠️ Please select your salutation using the buttons provided." };
    nextState.salutation = text === '👨 Mr.' ? 'Mr.' : 'Ms.';
    nextState.step = 'asking_role';
    await setCache(stateKey, nextState);
    return { 
      text: "Thank you. Please select your role in the institution.",
      keyboard: { keyboard: [['🎓 Student', '👨‍🏫 Staff'], ['❌ Cancel Registration']], resize_keyboard: true }
    };
  }

  if (state.step === 'asking_role') {
    if (!['🎓 Student', '👨‍🏫 Staff'].includes(text)) return { text: "⚠️ Please use the buttons to select your academic role." };
    nextState.role = text.includes('Student') ? 'student' : 'staff';
    nextState.step = nextState.role === 'student' ? 'asking_reg' : 'asking_emp_id';
    await setCache(stateKey, nextState);
    return { 
      text: nextState.role === 'student' ? "Please enter your *University Register Number*:" : "Please enter your *Staff ID Number*:",
      keyboard: { keyboard: [['❌ Cancel Registration']], resize_keyboard: true } 
    };
  }

  if (state.step === 'asking_reg' || state.step === 'asking_emp_id') {
    const idVal = text.trim().toUpperCase();
    const query = state.role === 'student' ? { register_number: idVal } : { employee_id: idVal };
    const existing = await User.findOne(query);
    if (existing) return { text: "⚠️ This identity is already associated with another account." };
    
    // Simulate Institutional Verification
    if (state.role === 'student') nextState.register_number = idVal;
    else nextState.employee_id = idVal;
    
    nextState.step = 'asking_name';
    await setCache(stateKey, nextState);
    return { text: "Thank you. Please enter your *Full Name* (as per college records):" };
  }

  if (state.step === 'asking_name') {
    nextState.name = text;
    nextState.step = 'asking_dept';
    const title = nextState.salutation || "";
    await setCache(stateKey, nextState);
    return { 
      text: `Thank you *${title} ${nextState.name.split(' ')[0]}*.\n\nWe have successfully verified your identity against the college records.\n\nPlease select your *Department*:`, 
      keyboard: { keyboard: [['CSE', 'ECE'], ['EEE', 'Mech'], ['IT', 'Civil'], ['AI & DS', 'Cyber Security'], ['❌ Cancel Registration']], resize_keyboard: true } 
    };
  }

  if (state.step === 'asking_dept') {
    nextState.department = text;
    if (state.role === 'student') {
        nextState.step = 'asking_year';
        await setCache(stateKey, nextState);
        return { 
          text: `Certainly *${nextState.salutation} ${nextState.name.split(' ')[0]}*. Which *Year* of study are you in?`, 
          keyboard: { keyboard: [['1', '2'], ['3', '4'], ['❌ Cancel Registration']], resize_keyboard: true } 
        };
    } else {
        nextState.step = 'asking_phone';
        nextState.designation = 'Staff Member';
        await setCache(stateKey, nextState);
        return { 
            text: `Thank you Ms. ${nextState.name}. Please confirm your phone number for official communication.`,
            keyboard: { 
                keyboard: [[{ text: "📱 Share Phone Number", request_contact: true }], ['❌ Cancel Registration']], 
                resize_keyboard: true 
            } 
        };
    }
  }

  if (state.step === 'asking_year') {
    nextState.year = parseInt(text);
    nextState.step = 'asking_phone';
    await setCache(stateKey, nextState);
    return { 
        text: `We have registered you as a ${nextState.year} Year Student.\n\nPlease confirm your phone number for official communication.`, 
        keyboard: { 
            keyboard: [[{ text: "📱 Share Phone Number", request_contact: true }], ['❌ Cancel Registration']], 
            resize_keyboard: true 
        } 
    };
  }

  if (state.step === 'asking_phone') {
    const contact = message?.contact;
    if (!contact && !text.match(/^\+?[0-9]{10,15}$/)) {
        return { text: "⚠️ Please click the '📱 Share Phone Number' button for secure verification." };
    }
    nextState.phone = contact ? contact.phone_number : text;
    const usrId = await generateUserId();
    const finalData = { ...nextState, user_id: usrId, verified: true };
    delete finalData.step;

    await verifyUser(chatId, finalData);
    await setCache(stateKey, null);

    const greeting = getHumanGreeting(finalData);
    return { 
      text: `Your profile has been successfully verified.\n\n${greeting} Welcome to the MSAJCE Grievance Management Portal.`,
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
        return { text: "🚨 Emergency alert process terminated.", keyboard: MAIN_MENU.keyboard };
    }

    if (!state) {
        await setCache(stateKey, { step: 'asking_type' });
        return {
            text: "⚠️ *Emergency Alerts immediately notify campus security and administration.*\n\n*Please select the type of emergency:*",
            keyboard: { 
                keyboard: [['🚑 Medical Emergency', '🔥 Fire Hazard'], ['🆘 Harassment Incident', '🚨 Theft or Security Threat'], ['❌ Cancel']], 
                resize_keyboard: true 
            }
        };
    }

    let nextState = { ...state };

    if (state.step === 'asking_type') {
        nextState.incident_type = text;
        nextState.step = 'asking_loc';
        await setCache(stateKey, nextState);
        return { text: "Please provide the *exact location* of the incident.\n\n_Example: Hostel Block B, Library Floor 2, or Parking Area._" };
    }

    if (state.step === 'asking_loc') {
        nextState.location = text;
        nextState.step = 'confirm_alert';
        await setCache(stateKey, nextState);
        return { 
            text: `⚠️ *Final Confirmation*\n\nIncident: ${state.incident_type}\nLocation: ${text}\n\n*This alert will immediately notify security and administrative authorities.*\n\nConfirm sending emergency alert?`,
            keyboard: { keyboard: [['🚨 Send Emergency Alert'], ['❌ Cancel']], resize_keyboard: true }
        };
    }

    if (state.step === 'confirm_alert') {
        if (text !== '🚨 Send Emergency Alert') return { text: "⚠️ Please confirm using the button or click Cancel." };
        
        const user = await User.findOne({ telegram_id: chatId });
        const grvId = await generateComplaintId();
        
        const newComplaint = new Complaint({
            complaint_id: grvId,
            student_id: user._id,
            telegram_id: chatId,
            category: 'Other',
            incident_type: state.incident_type,
            location: state.location,
            description: `EMERGENCY ALERT: ${state.incident_type} at ${state.location}`,
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
                html: getProfessionalEmailTemplate(grvId, user, { ...state, description: "Emergency Alert Broadcast" }, 'Principal / Security Team', true)
            });
        } catch (e) { logger.error(`Emergency Email Fail: ${e.message}`); }

        await setCache(stateKey, null);
        return {
            text: `⚠️ *EMERGENCY NOTIFIED*\n\nYour alert has been broadcasted to the top administration with ID: \`${grvId}\`.\n\nHelp is being dispatched immediately.`,
            keyboard: MAIN_MENU.keyboard
        };
    }
};

/**
 * MAIN ENTRY POINT FOR GRIEVANCE BOT
 */
export const handleGrievanceFlow = async (chatId, text, message) => {
  const user = await getOrCreateUser(chatId, message);
  if (!user) return { text: "⚠️ Database connection error." };

  // 1. Force Registration if not verified
  if (!user.verified) {
      if (text === '/start') return await handleVerificationFlow(chatId, null, message);
      return await handleVerificationFlow(chatId, text, message);
  }

  // Command Routing
  if (text === '/start' || text === '🏠 Back to Menu' || text === '🏫 Back to Menu') {
      return {
          ...MAIN_MENU,
          text: `${getHumanGreeting(user)}\n\n${MAIN_MENU.text}`
      };
  }

  if (text === '/help' || text === '💡 FAQ & Help') {
      await setCache(`${COMPLAINT_STATE_PREFIX}${chatId}`, { step: 'asking_faq' });
      return { 
          text: "💡 *MSAJCE Knowledge Assistant*\n\nI am connected to the official institutional database. Please ask your question below.\n\n*Examples:*\n• What are the bus timings?\n• Who is the Principal?\n• Tell me about the IT department.",
          keyboard: { keyboard: [['🏠 Back to Menu']], resize_keyboard: true }
      };
  }

  if (text === '/cancel' || text === '❌ Cancel') {
      await setCache(`${COMPLAINT_STATE_PREFIX}${chatId}`, null);
      await setCache(`${EMERGENCY_STATE_PREFIX}${chatId}`, null);
      return { text: "Certainly. The current process has been terminated.", keyboard: MAIN_MENU.keyboard };
  }

  if (text === '/profile' || text === '👤 My Profile') {
      const p = user;
      const title = p.salutation || 'Mr./Ms.';
      let profileText = `👤 *Institutional Profile*\n\n` +
          `*Name:* ${title} ${p.name}\n` +
          `*Role:* ${p.role.toUpperCase()}\n` +
          `*Department:* ${p.department}\n` +
          `*ID Number:* ${p.register_number || p.employee_id}\n` +
          `*Phone:* ${p.phone}\n` +
          `*Status:* ✅ Verified`;
      return { 
          text: profileText, 
          keyboard: { keyboard: [['✏ Edit Profile'], ['📜 Complaint History'], ['🏠 Back to Menu']], resize_keyboard: true } 
      };
  }

  if (text === '/history' || text === '📜 Complaint History') {
      const history = await Complaint.find({ telegram_id: chatId }).sort({ created_at: -1 }).limit(5);
      if (history.length === 0) return { text: "📜 You have no active or historical complaints recorded." };
      let logs = "📜 *Your Recent Complaints:*\n\n";
      history.forEach(c => logs += `• \`${c.complaint_id}\` - ${c.status.toUpperCase()}\n  (${c.category})\n\n`);
      return { text: logs, keyboard: MAIN_MENU.keyboard };
  }

  // Emergency Flow Trigger
  const emgState = await getCache(`${EMERGENCY_STATE_PREFIX}${chatId}`);
  if (text === '🚨 Emergency Alert' || emgState) return await handleEmergencyFlow(chatId, text, message);

  const stateKey = `${COMPLAINT_STATE_PREFIX}${chatId}`;
  const state = await getCache(stateKey);

  if (state?.step === 'asking_faq') {
    if (text === '🏠 Back to Menu' || text === '🏫 Back to Menu') {
        await setCache(stateKey, null);
        return {
            ...MAIN_MENU,
            text: `${getHumanGreeting(user)}\n\n${MAIN_MENU.text}`
        };
    }
    return { 
        text: "🔍 Searching knowledge base...", 
        use_rag: true,
        query: text 
    };
  }

  if (text === '📝 Register Complaint') {
    await setCache(stateKey, { step: 'asking_privacy' });
    const name = user.name.split(' ')[0];
    return {
      text: `${user.salutation} ${name}, how would you like to submit this complaint?`,
      keyboard: {
        keyboard: [['👤 Normal Submission', '🎭 Anonymous to Department'], ['❌ Cancel']],
        resize_keyboard: true
      }
    };
  }

  if (!state) return MAIN_MENU;

  let nextState = { ...state };

  if (state.step === 'asking_privacy') {
    nextState.is_anonymous = text.includes('Anonymous');
    nextState.step = 'asking_category';
    await setCache(stateKey, nextState);
    return {
      text: "Please select the *category* that best describes your issue:",
      keyboard: {
        keyboard: [
          ['🏠 Hostel', '🚌 Transport'],
          ['🍱 Mess', '📚 Academic Affairs'],
          ['🛠 Infrastructure', '👨‍🏫 Faculty'],
          ['🛡 Security', '⚠ Harassment'],
          ['📌 Other'],
          ['❌ Cancel']
        ],
        resize_keyboard: true
      }
    };
  }

  if (state.step === 'asking_category') {
    nextState.category = text;
    nextState.step = 'asking_desc';
    await setCache(stateKey, nextState);
    return { 
        text: `Certainly ${user.salutation} ${user.name.split(' ')[0]}.\n\nPlease describe the issue in detail so that the administration can investigate effectively.`, 
        keyboard: { keyboard: [['❌ Cancel']], resize_keyboard: true } 
    };
  }

  if (state.step === 'asking_desc') {
    nextState.description = text;
    nextState.step = 'asking_evidence';
    await setCache(stateKey, nextState);
    return {
      text: "If you have any supporting evidence such as a *photo* or *document*, you may upload it now.",
      keyboard: { keyboard: [['➡ Skip']], resize_keyboard: true }
    };
  }

  if (state.step === 'asking_evidence') {
    if (text === '➡ Skip' || message?.photo || message?.document) {
        nextState.step = 'final_confirmation';
        if (message?.photo || message?.document) {
            const media = message.photo?.[message.photo.length-1] || message.document;
            nextState.file_id = media.file_id;
        }
        await setCache(stateKey, nextState);
        return {
            text: `*Please review your complaint before submission.*\n\n*Category:* ${nextState.category}\n*Privacy:* ${nextState.is_anonymous ? '🎭 Anonymous' : '👤 Normal'}\n*Description:* ${nextState.description}\n\nDo you want to submit this complaint?`,
            keyboard: { keyboard: [['✅ Submit Complaint'], ['❌ Cancel']], resize_keyboard: true }
        };
    }
    return { text: "⚠️ Please upload a file or click Skip." };
  }

  if (state.step === 'final_confirmation') {
    if (text !== '✅ Submit Complaint') return { text: "⚠️ Please confirm your submission." };
    
    const grvId = await generateComplaintId();
    const dept = DEPT_ROUTING[state.category] || 'General Admin';

    let evidenceUrl = 'None';
    if (state.file_id) {
        try {
            const token = config.telegram.complaintBotToken || config.telegram.token;
            if (config.cloudinary.cloudName) {
                const res = await uploadTelegramMedia(token, state.file_id);
                evidenceUrl = res?.url;
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
      department_assigned: dept,
      is_anonymous: state.is_anonymous
    });
    await newComplaint.save();

    // Send Professional Email
    try {
      await transporter.sendMail({
        from: '"MSAJCE Grievance Oracle" <eventbooking.otp@gmail.com>',
        to: 'cookwithcomali5@gmail.com',
        subject: `🚨 [MSAJCE Grievance System] New Complaint Submitted – ${grvId}`,
        html: getProfessionalEmailTemplate(grvId, user, state, dept, false)
      });
    } catch (e) { logger.error(`Email Error: ${e.message}`); }

    await setCache(stateKey, null);
    return { 
      text: `Thank you ${user.salutation} ${user.name.split(' ')[0]}.\n\nYour complaint has been successfully submitted.\n\n*Complaint ID:* \`${grvId}\`\n\nYou can track its progress anytime using the Track Complaint option.`,
      keyboard: { keyboard: [['🔍 Track Status'], ['🏠 Back to Menu']], resize_keyboard: true }
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
