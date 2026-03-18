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

const getHumanGreeting = (user) => {
  if (!user || !user.verified) return "Welcome to the Official MSAJCE Grievance Assistance System.";
  const title = user.salutation || "";
  const name = user.name ? user.name.split(' ')[0] : "User";
  return `Hello ${title} ${name}. I will assist you with the portal operations.`;
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.email.user,
    pass: config.email.pass
  }
});

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: '"MSAJCE Grievance Oracle" <eventbooking.otp@gmail.com>',
      to,
      subject,
      html
    });
    return true;
  } catch (e) {
    logger.error(`SMTP Error: ${e.message}`);
    return false;
  }
};

const COMPLAINT_STATE_PREFIX = 'grv_state:';
const VERIFY_STATE_PREFIX = 'verify_state:';
const EMERGENCY_STATE_PREFIX = 'emg_state:';

const DEPT_ROUTING = {
  'Hostel': 'Hostel Warden',
  'Mess': 'Mess Committee',
  'Transport': 'Transport Manager',
  'Academic': 'Academic Office',
  'Technical': 'IT Support Team',
  'Harassment': 'Principal / Disciplinary Committee',
  'Other': 'General Admin'
};

export const MAIN_MENU = {
  text: "🏛 **MSAJCE Official Grievance Redressal Portal**\n\nWelcome back. This terminal allows you to file formal grievances, report campus emergencies, and track resolution status in real-time.\n\n*Please select an institutional service to proceed:*",
  keyboard: {
    keyboard: [
      ['📝 Register Complaint', '🚨 Emergency Alert'],
      ['🔎 Track Complaint', '📂 My Complaints'],
      ['💡 FAQ & Help', '📞 Contact Administration'],
      ['⚙ Report System Issue']
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

const FAQ_DATA = {
  text: "Institutional Knowledge Hub\n\nExplore our facilities and procedural details below:",
  keyboard: {
    keyboard: [
        ['📌 Grievance Rules', '🏫 Departments'],
        ['🚌 Transport Hub', '🏠 Return to Dashboard']
    ],
    resize_keyboard: true
  }
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

const generateComplaintId = async (isEmergency = false) => {
  const count = await Complaint.countDocuments({ is_emergency: isEmergency });
  const prefix = isEmergency ? 'EMG' : 'GRV';
  return `${prefix}-${(count + 2043).toString().padStart(4, '0')}`;
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
 * Step-by-Step Profile Verification Flow (Deterministic)
 */
export const handleVerificationFlow = async (chatId, text, message) => {
  const stateKey = `${VERIFY_STATE_PREFIX}${chatId}`;
  const state = await getCache(stateKey);

  // 0. Cancel Logic
  if (text === '❌ Cancel Enrollment' || text === '/cancel') {
    await setCache(stateKey, null);
    return { text: "❌ Verification process terminated. Use /start to try again.", keyboard: { remove_keyboard: true } };
  }

  // 1. Initial Trigger
  if (!state) {
    const tgName = message?.from?.first_name || "";
    await setCache(stateKey, { step: 'asking_name' });
    return {
      text: "🛡️ **MSAJCE Identity Enrollment**\n\nTo ensure institutional security, please provide your legal name as per college records.\n\n_Is your name correct below?_",
      keyboard: {
        keyboard: [
          [tgName],
          ['❌ Cancel Enrollment']
        ],
        resize_keyboard: true
      }
    };
  }

  let nextState = { ...state };

  // 2. Handling Steps
  switch (state.step) {
    case 'asking_name':
      if (text.startsWith('/') || text.length < 3) return { text: "⚠️ Please enter a valid name (at least 3 characters and no commands)." };
      nextState.name = text.trim();
      nextState.step = 'asking_role';
      await setCache(stateKey, nextState);
      return {
        text: `Thank you *${nextState.name}*. Select your role:`,
        keyboard: { keyboard: [['🎓 Student', '👨‍🏫 Staff'], ['❌ Cancel Enrollment']], resize_keyboard: true }
      };

    case 'asking_role':
      if (!['🎓 Student', '👨‍🏫 Staff'].includes(text)) return { text: "⚠️ Please select your role using the buttons." };
      nextState.role = text.includes('Student') ? 'student' : 'staff';
      nextState.step = 'asking_id';
      await setCache(stateKey, nextState);
      return {
        text: `Enter your *${nextState.role === 'student' ? 'Register Number' : 'Staff ID'}*:`,
        keyboard: { keyboard: [['❌ Cancel Enrollment']], resize_keyboard: true }
      };

    case 'asking_id':
      if (text.startsWith('/') || text.length < 2) return { text: "⚠️ Please enter a valid institutional ID." };
      const idVal = text.trim().toUpperCase();
      if (nextState.role === 'student') nextState.register_number = idVal;
      else nextState.employee_id = idVal;
      nextState.step = 'asking_dept';
      await setCache(stateKey, nextState);
      return {
        text: "Select your *Department*:",
        keyboard: { keyboard: [['CSE', 'IT', 'ECE'], ['EEE', 'MECH', 'CIVIL'], ['MBA', 'MCA'], ['❌ Cancel Enrollment']], resize_keyboard: true }
      };

    case 'asking_dept': {
      const depts = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MBA', 'MCA'];
      if (!depts.includes(text.toUpperCase())) return { text: "⚠️ Select from the available departments." };
      nextState.department = text.toUpperCase();
      nextState.step = 'asking_email';
      await setCache(stateKey, nextState);
      return {
        text: "📧 Enter your *official college email* (@msajce-edu.in):",
        keyboard: { keyboard: [['❌ Cancel Enrollment']], resize_keyboard: true }
      };
    }

    case 'asking_email':
      const email = text.trim().toLowerCase();
      if (!email.endsWith('@msajce-edu.in')) {
        return { text: "⚠️ Only official *@msajce-edu.in* email addresses are allowed.\n\nExample: `student@msajce-edu.in`" };
      }
      nextState.email = email;
      nextState.step = 'review_details';
      await setCache(stateKey, nextState);
      return {
        text: `🔍 *Institutional Identity Review*\n\n**Name:** ${nextState.name}\n**Role:** ${nextState.role.toUpperCase()}\n**ID:** ${nextState.register_number || nextState.employee_id}\n**Dept:** ${nextState.department}\n**Email:** ${nextState.email}\n\n*Are these details correct?*`,
        keyboard: { keyboard: [['✅ Correct - Send OTP'], ['✏ Name', '✏ Role'], ['✏ ID Number', '✏ Dept'], ['✏ Email', '❌ Cancel Enrollment']], resize_keyboard: true }
      };

    case 'review_details':
      if (text.includes('Correct')) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const html = `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #2563eb;">MSAJCE Verification</h2>
              <p>Your OTP for the Grievance Portal is:</p>
              <div style="font-size: 32px; font-weight: 800; letter-spacing: 5px; color: #1e293b; padding: 10px 0;">${otp}</div>
              <p style="color: #64748b; font-size: 12px;">This code expires in 10 minutes.</p>
            </div>
          `;
        const emailSent = await sendEmail(nextState.email, "MSAJCE Portal Security Code", html);
        if (!emailSent) return { text: "❌ Failed to send OTP. Attempting institutional SMTP reset. Please try again." };
        nextState.otp = otp;
        nextState.step = 'asking_otp';
        await setCache(stateKey, nextState);
        return { text: "📩 A 6-digit OTP has been sent to your email. Please enter it here:", keyboard: { keyboard: [['❌ Cancel Enrollment']], resize_keyboard: true } };
      }

      if (text.includes('Name')) { nextState.step = 'edit_name'; await setCache(stateKey, nextState); return { text: "Enter your correct *Full Name*:" }; }
      if (text.includes('Role')) { nextState.step = 'edit_role'; await setCache(stateKey, nextState); return { text: "Select your correct role:", keyboard: { keyboard: [['🎓 Student', '👨‍🏫 Staff'], ['❌ Cancel Enrollment']], resize_keyboard: true } }; }
      if (text.includes('ID')) { nextState.step = 'edit_id'; await setCache(stateKey, nextState); return { text: "Enter your correct *ID/Register Number*:" }; }
      if (text.includes('Dept')) { nextState.step = 'edit_dept'; await setCache(stateKey, nextState); return { text: "Select your correct *Department*:", keyboard: { keyboard: [['CSE', 'IT', 'ECE'], ['EEE', 'MECH', 'CIVIL'], ['MBA', 'MCA'], ['❌ Cancel Enrollment']], resize_keyboard: true } }; }
      if (text.includes('Email')) { nextState.step = 'edit_email'; await setCache(stateKey, nextState); return { text: "Enter your correct *Official Email* (@msajce-edu.in):" }; }

      return { text: "⚠️ Please use the buttons below to confirm or edit details." };

    case 'edit_name':
      if (text.startsWith('/') || text.length < 3) return { text: "⚠️ Enter a valid name." };
      nextState.name = text.trim();
      nextState.step = 'review_details';
      await setCache(stateKey, nextState);
      return { text: "✅ Name updated.", keyboard: { keyboard: [['✅ Correct - Send OTP'], ['✏ Name', '✏ Role'], ['✏ ID Number', '✏ Dept'], ['✏ Email', '❌ Cancel Enrollment']], resize_keyboard: true } };

    case 'edit_role':
      if (!['🎓 Student', '👨‍🏫 Staff'].includes(text)) return { text: "⚠️ Select a role." };
      nextState.role = text.includes('Student') ? 'student' : 'staff';
      nextState.step = 'review_details';
      await setCache(stateKey, nextState);
      return { text: "✅ Role updated.", keyboard: { keyboard: [['✅ Correct - Send OTP'], ['✏ Name', '✏ Role'], ['✏ ID Number', '✏ Dept'], ['✏ Email', '❌ Cancel Enrollment']], resize_keyboard: true } };

    case 'edit_id':
      if (text.startsWith('/') || text.length < 2) return { text: "⚠️ Enter a valid ID." };
      if (nextState.role === 'student') nextState.register_number = text.trim().toUpperCase();
      else nextState.employee_id = text.trim().toUpperCase();
      nextState.step = 'review_details';
      await setCache(stateKey, nextState);
      return { text: "✅ ID updated.", keyboard: { keyboard: [['✅ Correct - Send OTP'], ['✏ Name', '✏ Role'], ['✏ ID Number', '✏ Dept'], ['✏ Email', '❌ Cancel Enrollment']], resize_keyboard: true } };

    case 'edit_dept': {
      const depts = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MBA', 'MCA'];
      if (!depts.includes(text.toUpperCase())) return { text: "⚠️ Select a department." };
      nextState.department = text.toUpperCase();
      nextState.step = 'review_details';
      await setCache(stateKey, nextState);
      return { text: "✅ Department updated.", keyboard: { keyboard: [['✅ Correct - Send OTP'], ['✏ Name', '✏ Role'], ['✏ ID Number', '✏ Dept'], ['✏ Email', '❌ Cancel Enrollment']], resize_keyboard: true } };
    }

    case 'edit_email':
      if (!text.trim().toLowerCase().endsWith('@msajce-edu.in')) return { text: "⚠️ Must be *@msajce-edu.in*." };
      nextState.email = text.trim().toLowerCase();
      nextState.step = 'review_details';
      await setCache(stateKey, nextState);
      return { text: "✅ Email updated.", keyboard: { keyboard: [['✅ Correct - Send OTP'], ['✏ Name', '✏ Role'], ['✏ ID Number', '✏ Dept'], ['✏ Email', '❌ Cancel Enrollment']], resize_keyboard: true } };

    case 'asking_otp':
      if (text.trim() !== state.otp) return { text: "❌ Incorrect OTP. Please try again." };
      const usrId = await generateUserId();
      const finalData = { ...nextState, user_id: usrId, verified: true };
      delete finalData.step;
      delete finalData.otp;
      await verifyUser(chatId, finalData);
      await setCache(stateKey, null);
      return { text: "✅ *Profile Verified Successfully*\n\nWelcome to the MSAJCE Internal Grievance System.", keyboard: MAIN_MENU.keyboard };

    default:
      await setCache(stateKey, null);
      return MAIN_MENU;
  }
};

/**
 * EMERGENCY ALERT FLOW (Rate Limited & Deterministic)
 */
export const handleEmergencyFlow = async (chatId, text, user) => {
  const stateKey = `${EMERGENCY_STATE_PREFIX}${chatId}`;
  const state = await getCache(stateKey);

  // Rate Limit Check
  const today = new Date().toDateString();
  const lastEmg = user.last_emergency_date ? new Date(user.last_emergency_date).toDateString() : null;
  if (today === lastEmg && (user.emergency_today_count || 0) >= 1) {
    return { text: "⚠️ *Emergency Alert Limit Reached*\n\nOnly one emergency alert is allowed per day for security reasons.", keyboard: MAIN_MENU.keyboard };
  }

  if (text.includes('Cancel') || text === '/cancel') {
    await setCache(stateKey, null);
    return { text: "🚨 Emergency process cancelled.", keyboard: MAIN_MENU.keyboard };
  }

  if (!state) {
    await setCache(stateKey, { step: 'asking_type' });
    return {
      text: "🚑 *Campus Emergency System*\n\nPlease select the type of emergency:",
      keyboard: {
        keyboard: [['🚑 Medical Emergency', '🔥 Fire Hazard'], ['🆘 Harassment', '🚨 Theft / Security'], ['❌ Cancel']],
        resize_keyboard: true
      }
    };
  }

  let nextState = { ...state };
  if (state.step === 'asking_type') {
    nextState.incident_type = text;
    nextState.step = 'asking_loc';
    await setCache(stateKey, nextState);
    return { text: "📍 Please enter the *incident location*:" };
  }

  if (state.step === 'asking_loc') {
    nextState.location = text;
    nextState.step = 'confirm';
    await setCache(stateKey, nextState);
    return {
      text: `⚠ *CONFIRM ALERT*\n\nType: ${nextState.incident_type}\nLoc: ${text}\n\n*Sending this will notify administration and security immediately.*`,
      keyboard: { keyboard: [['🚨 Send Alert'], ['❌ Cancel']], resize_keyboard: true }
    };
  }

    if (state.step === 'confirm') {
        if (!text.includes('Send Alert')) return { text: "⚠️ Use the button to send alert or Cancel." };
        
        const grvId = await generateComplaintId(true);
    const newComplaint = new Complaint({
      complaint_id: grvId,
      student_id: user._id,
      telegram_id: chatId,
      category: 'Other',
      incident_type: nextState.incident_type,
      location: nextState.location,
      description: `🚨 EMERGENCY: ${nextState.incident_type} at ${nextState.location}`,
      is_emergency: true,
      status: 'submitted',
      department_assigned: 'Security / Administration'
    });
    await newComplaint.save();

    // Update Rate Limits
    user.emergency_today_count = (user.emergency_today_count || 0) + 1;
    user.last_emergency_date = new Date();
    await user.save();

    await sendEmail('cookwithcomali5@gmail.com', `🆘 EMERGENCY: ${nextState.incident_type}`, getProfessionalEmailTemplate(grvId, user, { description: `Emergency: ${nextState.incident_type} at ${nextState.location}` }, 'Security', true));

    await setCache(stateKey, null);
    return { text: "🚨 *Emergency Alert Sent*\n\nHelp is being dispatched. ID: `" + grvId + "`", keyboard: MAIN_MENU.keyboard };
  }
};

/**
 * REGISTER COMPLAINT FLOW
 */
export const handleRegisterFlow = async (chatId, text, user, message) => {
  const stateKey = `${COMPLAINT_STATE_PREFIX}${chatId}`;
  const state = await getCache(stateKey);

  // Rate Limit Check
  const today = new Date().toDateString();
  const lastCmp = user.last_complaint_date ? new Date(user.last_complaint_date).toDateString() : null;
  if (today === lastCmp && (user.complaints_today_count || 0) >= 3) {
    return { text: "⚠️ *Daily Limit Reached*\n\nYou can only submit 3 complaints per day.", keyboard: MAIN_MENU.keyboard };
  }

  if (text.includes('Cancel') || text === '/cancel') {
    await setCache(stateKey, null);
    return { text: "❌ Registration cancelled.", keyboard: MAIN_MENU.keyboard };
  }

  if (!state) {
    await setCache(stateKey, { step: 'asking_privacy' });
    return {
      text: "📝 *Register New Complaint*\n\nSelect privacy level:",
      keyboard: { keyboard: [['👤 Normal', '🎭 Anonymous'], ['❌ Cancel']], resize_keyboard: true }
    };
  }

  let nextState = { ...state };
  switch (state.step) {
    case 'asking_privacy':
      nextState.is_anonymous = text.includes('Anonymous');
      nextState.step = 'asking_category';
      await setCache(stateKey, nextState);
      return {
        text: "Select Category:",
        keyboard: { keyboard: [['🏠 Hostel', '🍱 Mess'], ['🚌 Transport', '📚 Academic'], ['💻 Technical', '⚠ Harassment'], ['❌ Cancel']], resize_keyboard: true }
      };

    case 'asking_category':
      if (text.includes('Hostel')) nextState.category = 'Hostel Issues';
      else if (text.includes('Mess')) nextState.category = 'Mess / Food';
      else if (text.includes('Transport')) nextState.category = 'Transport / Bus';
      else if (text.includes('Academic')) nextState.category = 'Faculty Issues';
      else if (text.includes('Technical')) nextState.category = 'WiFi / IT Issues';
      else if (text.includes('Harassment')) nextState.category = 'Harassment / Misconduct';
      else nextState.category = 'Other';
      
      nextState.step = 'asking_desc';
      await setCache(stateKey, nextState);
      return { text: "Please describe the issue in detail:" };

    case 'asking_desc':
      nextState.description = text;
      nextState.step = 'asking_evidence';
      nextState.evidence_ids = []; 
      await setCache(stateKey, nextState);
      return {
        text: "Please upload supporting evidence (Photo, Document, or Video).\n\n_Note: You can upload up to 5 files._",
        keyboard: { keyboard: [['➡ Skip / Finish']], resize_keyboard: true }
      };

    case 'asking_evidence':
      const currentFiles = nextState.evidence_ids || [];
      const hasMedia = message?.photo || message?.document || message?.video;

      if (hasMedia) {
        if (currentFiles.length >= 5) {
          return { text: "⚠️ Maximum limit of 5 files reached. Please click '✅ Finish & Review'." };
        }
        const media = message.photo ? message.photo[message.photo.length - 1] : (message.document || message.video);
        currentFiles.push(media.file_id);
        nextState.evidence_ids = currentFiles;
        await setCache(stateKey, nextState);

        return {
          text: `✅ File #${currentFiles.length} received. You can upload more (up to 5) or finish.`,
          keyboard: { keyboard: [['✅ Finish & Review'], ['❌ Cancel']], resize_keyboard: true }
        };
      }

      if (text.includes('Finish') || text.includes('Skip')) {
        nextState.step = 'review';
        await setCache(stateKey, nextState);
        return {
          text: `📑 **REVIEW COMPLAINT**\n\n**Category:** ${nextState.category}\n**Privacy:** ${nextState.is_anonymous ? 'Anonymous' : 'Normal'}\n**Evidence:** ${nextState.evidence_ids.length} file(s)\n**Description:** ${nextState.description}`,
          keyboard: { keyboard: [['✅ Submit Complaint'], ['❌ Cancel']], resize_keyboard: true }
        };
      }
      return { text: "⚠️ Please upload a media file or use the buttons to finish." };
    case 'review':
      if (!text.includes('Submit Complaint')) return { text: "⚠️ Please confirm using the button." };
      
      const grvId = await generateComplaintId(false);
      const evidenceUrls = [];

      // Process and Upload Media
      if (nextState.evidence_ids && nextState.evidence_ids.length > 0) {
        const token = config.telegram.complaintBotToken || config.telegram.token;
        for (const fId of nextState.evidence_ids) {
          try {
            const upload = await uploadTelegramMedia(token, fId);
            if (upload?.url) evidenceUrls.push(upload.url);
          } catch (err) {
            logger.error(`Multi-upload failed for ${fId}: ${err.message}`);
          }
        }
      }

      const newC = new Complaint({
        complaint_id: grvId,
        student_id: user._id,
        telegram_id: chatId,
        category: nextState.category,
        description: nextState.description,
        is_anonymous: nextState.is_anonymous,
        evidence_urls: evidenceUrls,
        department_assigned: DEPT_ROUTING[nextState.category.split(' ')[0]] || 'Admin'
      });
      await newC.save();

      // Send Email Notification
      await sendEmail('cookwithcomali5@gmail.com', `📝 New Grievance: ${grvId}`, getProfessionalEmailTemplate(grvId, user, nextState, DEPT_ROUTING[nextState.category.split(' ')[0]] || 'Admin', false));

      user.complaints_today_count = (user.complaints_today_count || 0) + 1;
      user.last_complaint_date = new Date();
      await user.save();

      await setCache(stateKey, null);
      return { text: `✅ **Complaint Registered Successfully**\n\nYour Case ID is: \`${grvId}\`\n\nKeep this ID to track your resolution status.`, keyboard: MAIN_MENU.keyboard };

    default:
      return MAIN_MENU;
  }
};

/**
 * MAIN ENTRY POINT
 */
export const handleGrievanceFlow = async (chatId, text, message) => {
  const user = await getOrCreateUser(chatId, message);
  const clean = text.toLowerCase().trim();

  // 1. ABSOLUTE GLOBAL OVERRIDE (Reset & Core Commands)
  const isGlobalCmd = ['/start', '/dashboard', '/menu', '🏠 back to menu', '🏠 return to dashboard', '🏠 main menu', '🔙 back up', '🔙 back to menu', '🔙 back'].includes(clean) || /main menu|dashboard|/i.test(clean) && clean.includes('🏠');
  
  if (isGlobalCmd) {
    await setCache(`${COMPLAINT_STATE_PREFIX}${chatId}`, null);
    await setCache(`${EMERGENCY_STATE_PREFIX}${chatId}`, null);
    await setCache(`${VERIFY_STATE_PREFIX}${chatId}`, null);
    await setCache(`track:${chatId}`, null);

    if (!user || !user.verified) return await handleVerificationFlow(chatId, text, message);

    if (/dashboard|menu/i.test(clean)) {
        return MAIN_MENU;
    }

    const greeting = getHumanGreeting(user);
    return { ...MAIN_MENU, text: `${greeting}\n\n${MAIN_MENU.text}` };
  }

  // 2. Command Aliases
  if (clean === '/my_complaints') return handleGrievanceFlow(chatId, '📂 My Complaints', message);
  if (clean === '/report_bug') return handleGrievanceFlow(chatId, '⚙ Report System Issue', message);
  if (clean === '/verify_profile' || clean === '/profile') {
      await User.findOneAndUpdate({ telegram_id: chatId }, { verified: false });
      return await handleVerificationFlow(chatId, null, message);
  }

  // 3. Verification Gate
  const vState = await getCache(`${VERIFY_STATE_PREFIX}${chatId}`);
  if (!user || !user.verified || vState) {
    return await handleVerificationFlow(chatId, text, message);
  }

  // 3. Active Flow Check
  const grvState = await getCache(`${COMPLAINT_STATE_PREFIX}${chatId}`);
  if (grvState) return await handleRegisterFlow(chatId, text, user, message);

  const emgState = await getCache(`${EMERGENCY_STATE_PREFIX}${chatId}`);
  if (emgState) return await handleEmergencyFlow(chatId, text, user);

  // 4. Global Ticket ID Match (Support clicking buttons from History/Lists)
  if (text.toUpperCase().trim().match(/^(GRV|EMG)-\d+$/)) {
      return await trackComplaint(text);
  }

  // 5. Command Routing (Verified Users Only)
  
  if (/register complaint|📝/i.test(clean)) return await handleRegisterFlow(chatId, text, user, message);
  if (/emergency alert|🚨/i.test(clean) || /emergency|alert|sos|assistance/i.test(clean)) return await handleEmergencyFlow(chatId, text, user);

  if (/track|status|check/.test(clean) && !clean.includes('my complaints')) {
    await setCache(`track:${chatId}`, true);
    return {
      text: "🔎 **Institutional Tracking System**\n\nPlease enter the unique Complaint ID (e.g. `GRV-2045`) associated with your request:",
      keyboard: { keyboard: [['🔙 Back to Menu']], resize_keyboard: true }
    };
  }

  // Active tracking state handling
  const isTracking = await getCache(`track:${chatId}`);
  if (isTracking) {
    if (text.toUpperCase().trim().match(/^(GRV|EMG)-/)) {
      await setCache(`track:${chatId}`, null);
      return await trackComplaint(text);
    }
  }

  // 5. My Complaints & Records
  if (/history|my records|my complaints|📂/.test(clean)) {
    const history = await Complaint.find({ telegram_id: chatId }).sort({ created_at: -1 }).limit(10);
    if (history.length === 0) {
        return { 
            text: "You have no active or historical complaints on record.", 
            keyboard: { keyboard: [['🏠 Return to Dashboard']], resize_keyboard: true } 
        };
    }
    
    let list = "Your Recent Case Files\n\n";
    const historyButtons = [];
    history.forEach(c => {
      const date = new Date(c.created_at).toLocaleDateString('en-IN');
      list += `ID: ${c.complaint_id}\nDate: ${date}\nIssue: ${c.description.slice(0, 40)}...\nStatus: ${c.status.toUpperCase()}\n\n`;
      historyButtons.push([c.complaint_id]);
    });
    
    return { 
        text: list, 
        keyboard: { 
            keyboard: [...historyButtons, ['🏠 Return to Dashboard']], 
            resize_keyboard: true 
        } 
    };
  }

  // 6. Profile & Verification
  if (/profile|account|identity|👤/.test(clean)) {
    if (/edit|update|change/.test(clean)) {
      await User.findOneAndUpdate({ telegram_id: chatId }, { verified: false });
      await setCache(`${VERIFY_STATE_PREFIX}${chatId}`, null);
      return await handleVerificationFlow(chatId, null, message);
    }
    const name = user.name || "Not Set";
    const role = (user.role || "student").toUpperCase();
    const id = user.register_number || user.employee_id || "Not Set";
    const dept = user.department || "Not Set";
    const email = user.email || "Not Set";

    return {
      text: `Institutional Identity Profile\n\nFull Name: ${name}\nDesignation: ${role}\nID Number: ${id}\nDepartment: ${dept}\nOfficial Email: ${email}\n\nVerification Status: Verified`,
      keyboard: { keyboard: [['✏ Edit Profile'], ['🏠 Return to Dashboard']], resize_keyboard: true }
    };
  }

  // 7. TRANSPORT HUB

  // 7. TRANSPORT HUB (Restored & Cleaned)
  const busMatch = clean.match(/(ar|r|r-)\s*(\d+)/i);
  if (busMatch || /transport|bus|route|pickup/i.test(clean)) {
      const busDetails = {
          'ar3': { driver: 'Mr. Sathish K', phone: '97899 70304', route: 'T. Nagar ↔ Campus', time: '06:20 AM' },
          'ar4': { driver: 'TBA', phone: '98408 86992', route: 'Moolakadai ↔ Campus', time: '06:10 AM' },
          'ar5': { driver: 'Mr. Murugan / Velu', phone: '99622 54425', route: 'MMDA School ↔ Campus', time: '06:15 AM' },
          'ar6': { driver: 'TBA', phone: '98408 86992', route: 'ICF ↔ Campus', time: '06:15 AM' },
          'ar7': { driver: 'TBA', phone: '98408 86992', route: 'Chunambedu ↔ Campus', time: '05:25 AM' },
          'ar8': { driver: 'Mr. Raju', phone: '97907 50906', route: 'Manjambakkam ↔ Campus', time: '07:10 AM' },
          'ar9': { driver: 'TBA', phone: '98408 86992', route: 'Ennore ↔ Campus', time: '06:15 AM' },
          'ar10': { driver: 'TBA', phone: '98408 86992', route: 'Porur ↔ Campus', time: '06:25 AM' },
          'r21': { driver: 'TBA', phone: '98408 86992', route: 'Contact Admin', time: 'Check Schedule' },
          'r22': { driver: 'Mr. Panneerselvam', phone: '98404 28612', route: 'Nemilichery ↔ Campus', time: '06:00 AM' }
      };

      if (busMatch) {
          const prefix = busMatch[1].toLowerCase().replace('-', '').trim();
          const num = busMatch[2].trim();
          const key = (prefix === 'ar' || prefix === 'r') ? `${prefix}${num}` : `r${num}`;
          const bus = busDetails[key];
          if (bus) {
            return {
                text: `Bus ${key.toUpperCase()}\n\nRoute: ${bus.route}\nDriver: ${bus.driver}\nContact: ${bus.phone}\nPickup: ${bus.time}\n\nNotice: Please reach the stop 5 mins early. For real-time updates, contact the driver directly.`,
                keyboard: { keyboard: [['🚌 Transport Hub'], ['🏠 Return to Dashboard']], resize_keyboard: true }
            };
          }
      }

      return {
          text: "MSAJCE Transport Hub\n\nSelect a bus route to view driver and schedule details:",
          keyboard: { 
              keyboard: [
                  ['AR3', 'AR4', 'AR5'], 
                  ['AR6', 'AR7', 'AR8'], 
                  ['AR9', 'AR10'],
                  ['R21', 'R22'],
                  ['🏠 Return to Dashboard']
              ], 
              resize_keyboard: true 
          }
      };
  }

  // 8. FAQ CATEGORIES
  
  if (/rules|grievance rules/i.test(clean)) {
      return {
          text: "Grievance Resolution Rules\n\n• Submission: All complaints must be formal and descriptive.\n• Anonymity: Your name won't be shared with college depts if 'Anonymous' is selected.\n• Limits: Maximum 3 complaints per 24 hours.\n• Evidence: Attach up to 5 files (Images/PDFs) for faster audit.",
          keyboard: { keyboard: [['🔙 Back to FAQ'], ['🏠 Return to Dashboard']], resize_keyboard: true }
      };
  }

  // 8. ACADEMIC DEPARTMENTS
  if (/department|branch|mech|civil|ece|electronics|cse|it|computing|eee|electrical|ai\s*&\s*ds|ai\s*&\s*ml|cyber|security|business\s*systems/i.test(clean)) {
      // 1. Mechanical
      if (/mech/i.test(clean)) {
          return { 
              text: "⚙ **Mechanical Engineering**\n\n" +
                    "• **Intake**: 30 Seats (Permanent Affiliation)\n" +
                    "• **Lead**: Mr. S. Syed Abuthahir (99441 27339)\n" +
                    "• **Email**: mech.syedabuthahir@msajce-edu.in\n" +
                    "• **Focus**: R&D in Thermal and Manufacturing.\n" +
                    "• **Facility**: Multi-Material 3D Printing Lab.",
              keyboard: { keyboard: [['🏫 Departments'], ['🔙 Back to FAQ']], resize_keyboard: true } 
          };
      }
      // 2. Civil
      if (/civil/i.test(clean)) {
          return { 
              text: "🏗 **Civil Engineering**\n\n" +
                    "• **Intake**: 30 (UG) | 18 (PG Structural)\n" +
                    "• **Asst Prof**: Mr. B. Rizha Ur Rahman (97908 36981)\n" +
                    "• **Email**: civil.rizha@msajce-edu.in\n" +
                    "• **Specialization**: Structural Design and QAQC.\n" +
                    "• **Labs**: Concrete and Highway Engineering Tech.",
              keyboard: { keyboard: [['🏫 Departments'], ['🔙 Back to FAQ']], resize_keyboard: true } 
          };
      }
      // 3. ECE
      if (/ece|electronics/i.test(clean)) {
          return { 
              text: "📡 **Electronics & Communication**\n\n" +
                    "• **Core Intake**: 60 Seats\n" +
                    "• **Specialized**: VLSI Design (30), Adv Comm (30)\n" +
                    "• **Contact**: Mrs. I. S. Suganthi (72997 72958)\n" +
                    "• **Email**: ece.suganthi@msajce-edu.in\n" +
                    "• **Hours**: 9:00 AM - 4:00 PM (Mon-Sat).",
              keyboard: { keyboard: [['🏫 Departments'], ['🔙 Back to FAQ']], resize_keyboard: true } 
          };
      }
      // 4. EEE
      if (/eee|electrical/i.test(clean)) {
          return { 
              text: "⚡ **Electrical & Electronics (EEE)**\n\n" +
                    "• **Intake**: 30 Seats\n" +
                    "• **Admin**: Dr. K.P. Santhosh Nathan (Admissions)\n" +
                    "• **Focus**: Power Systems and Smart Grid Tech.\n" +
                    "• **Projects**: Industry-sponsored renewable energy research.\n" +
                    "• **Placement**: Strong ties with Core Power sector.",
              keyboard: { keyboard: [['🏫 Departments'], ['🔙 Back to FAQ']], resize_keyboard: true } 
          };
      }
      // 5. CSE
      if (/cse|computer\s*science/i.test(clean)) {
          return { 
              text: "🖥 **Computer Science (CSE)**\n\n" +
                    "• **Intake**: 60 Seats (Permanent Affiliation)\n" +
                    "• **Lead**: Dr. D. Weslin (97152 02533)\n" +
                    "• **Org**: CSI Kancheepuram Student Chapter.\n" +
                    "• **Labs**: High-Performance AI Computing Lab.\n" +
                    "• **Focus**: Algorithm Design and Cloud Systems.",
              keyboard: { keyboard: [['🏫 Departments'], ['🔙 Back to FAQ']], resize_keyboard: true } 
          };
      }
      // 6. IT
      if (/it|information\s*technology/i.test(clean)) {
          return { 
              text: "🌐 **Information Technology (IT)**\n\n" +
                    "• **Intake**: 30 Seats (Reg 2024 PG)\n" +
                    "• **Admin**: Mr. A. Abdul Gafoor (99403 19629)\n" +
                    "• **Proximity**: Located near Sirucheri IT Park Hub.\n" +
                    "• **Focus**: Full-stack Development and Data Ops.\n" +
                    "• **Collab**: Industry 4.0 Readiness Centers.",
              keyboard: { keyboard: [['🏫 Departments'], ['🔙 Back to FAQ']], resize_keyboard: true } 
          };
      }
      // 7. AI & DS
      if (/ai\s*&\s*ds|data\s*science/i.test(clean)) {
          return { 
              text: "🤖 **Artificial Intelligence & DS**\n\n" +
                    "• **Intake**: 60 Seats\n" +
                    "• **Head**: Dr. K.S. Srinivasan (Admissions Oversight)\n" +
                    "• **Focus**: Big Data Analytics and Predictive Modeling.\n" +
                    "• **Tech**: Python, R, and Distributed Systems.\n" +
                    "• **Outlook**: High-demand industry placement.",
              keyboard: { keyboard: [['🏫 Departments'], ['🔙 Back to FAQ']], resize_keyboard: true } 
          };
      }
      // 8. AI & ML
      if (/ai\s*&\s*ml|machine\s*learning/i.test(clean)) {
          return { 
              text: "🧠 **Artificial Intelligence & ML**\n\n" +
                    "• **Intake**: 60 Seats\n" +
                    "• **Lead**: Dr. I. Manju (Technical Advice)\n" +
                    "• **Focus**: Deep Learning and Neural Networks.\n" +
                    "• **Environment**: Experimental Research-oriented labs.\n" +
                    "• **Competition**: Heavy involvement in Hackathons.",
              keyboard: { keyboard: [['🏫 Departments'], ['🔙 Back to FAQ']], resize_keyboard: true } 
          };
      }
      // 9. Cyber Security
      if (/cyber|security/i.test(clean)) {
          return { 
              text: "🛡 **Cyber Security**\n\n" +
                    "• **Intake**: 30 Seats\n" +
                    "• **Contact**: Dr. Vamsi (Admissions Desk)\n" +
                    "• **Focus**: Ethical Hacking and Network Security.\n" +
                    "• **Curriculum**: Regulations 2024 UG Path.\n" +
                    "• **Labs**: Secure Network Simulation Center.",
              keyboard: { keyboard: [['🏫 Departments'], ['🔙 Back to FAQ']], resize_keyboard: true } 
          };
      }
      // 10. CSBS
      if (/csbs|business\s*systems/i.test(clean)) {
          return { 
              text: "📊 **Computer Science & Business**\n\n" +
                    "• **Intake**: 30 Seats\n" +
                    "• **Officer**: Administrative Wing (Gafoor)\n" +
                    "• **Focus**: Fintech, ERP, and Enterprise Systems.\n" +
                    "• **Concept**: Blending CS with Management principles.\n" +
                    "• **Scope**: Placement in Top Tier 1 IT MNCs.",
              keyboard: { keyboard: [['🏫 Departments'], ['🔙 Back to FAQ']], resize_keyboard: true } 
          };
      }

      return {
          text: "Academic Departments\n\nSelect a branch to view structured official details:",
          keyboard: { 
              keyboard: [
                  ['⚙ Mechanical', '🏗 Civil'], 
                  ['📡 ECE', '⚡ EEE'], 
                  ['🖥 CSE', '🌐 IT'],
                  ['🤖 AI & DS', '🧠 AI & ML'],
                  ['🛡 Cyber Security', '📊 CSBS'],
                  ['🔙 Back to FAQ', '🏠 Return to Dashboard']
              ], 
              resize_keyboard: true 
          }
      };
  }

  // Knowledge Hub Root
  if (/faq|help|hub/i.test(clean)) {
      return FAQ_DATA;
  }

  // 9. ADMINISTRATION DIRECTORY
  if (/contact|admin|support|📞|principal|admission|hostel|account|office/.test(clean)) {
      if (/principal/i.test(clean)) {
          return {
              text: "Principal's Desk\n\nPrincipal: Dr. K.S. Srinivasan\nPhone: 91505 75066\nEmail: principal@msajce-edu.in\nAccess: Admin Block, 1st Floor.",
              keyboard: { keyboard: [['📞 Contact Administration'], ['🏠 Return to Dashboard']], resize_keyboard: true }
          };
      }
      if (/admission/i.test(clean)) {
          return {
              text: "Admission Cell\n\nHead: Dr. K.P. Santhosh Nathan (98408 86992)\nOther States Desk: Dr. Vamsi (90433 58674)\nLocation: Ground Floor Lobby.",
              keyboard: { keyboard: [['📞 Contact Administration'], ['🏠 Return to Dashboard']], resize_keyboard: true }
          };
      }
      if (/admin office|officer/i.test(clean)) {
          return {
              text: "Administrative Office\n\nAdmin Officer: Mr. A. Abdul Gafoor\nPhone: 99403 19629\nResponsibility: Statutory affairs.",
              keyboard: { keyboard: [['📞 Contact Administration'], ['🏠 Return to Dashboard']], resize_keyboard: true }
          };
      }
      if (/hostel/i.test(clean)) {
          return {
              text: "Hostel Administration\n\nBoys Hostel: Dr. S. Kamal (Inside Campus)\nGirls Hostel: Sholinganallur (5KM Away)\nWarden Contact: 94441 56789.",
              keyboard: { keyboard: [['📞 Contact Administration'], ['🏠 Return to Dashboard']], resize_keyboard: true }
          };
      }
      if (/transport office/i.test(clean)) {
          return {
              text: "Transport Office\n\nConvener: Dr. K.P. Santhosh Nathan\nAsst: Mr. A. Abdul Gafoor\n\nUse Transport Hub for bus-specific drivers.",
              keyboard: { keyboard: [['🚌 Transport Hub'], ['📞 Contact Administration'], ['🏠 Return to Dashboard']], resize_keyboard: true }
          };
      }
      return {
          text: "Institutional Directory\n\nDirect links to administrative departments:",
          keyboard: { keyboard: [['👨‍💼 Principal', '🎓 Admission'], ['👔 Admin Office', '🏠 Hostel'], ['🚌 Transport Office'], ['🏠 Return to Dashboard']], resize_keyboard: true }
      };
  }

  // 10. SYSTEM ISSUE
  if (/report system issue|bug/i.test(clean)) {
      return {
          text: "System Support Desk\n\nPlease describe the technical issue or bug. Our developers will review it within 24 hours.",
          keyboard: { keyboard: [['🏠 Return to Dashboard']], resize_keyboard: true }
      };
  }

  const professionalMenu = (user && user.verified) ? MAIN_MENU : { text: "⚠ Identity Enrollment Required", keyboard: { keyboard: [['👤 Complete Profile']], resize_keyboard: true } };
  return professionalMenu;
};

export const trackComplaint = async (id) => {
  const c = await Complaint.findOne({ complaint_id: id.toUpperCase().trim() });
  if (!c) return { text: "Invalid Ticket ID.\n\nPlease check the ID and try again." };
  
  const date = new Date(c.created_at).toLocaleDateString('en-IN');
  const time = new Date(c.created_at).toLocaleTimeString('en-IN');
  
  let reportText = `Ticket Audit Report\n\n` +
      `Ticket ID: ${c.complaint_id}\n\n` +
      `Current Status: ${c.status.toUpperCase()}\n\n` +
      `Assigned Pool: ${c.department_assigned || 'Not Yet Assigned'}\n\n` +
      `Submission Date: ${date} at ${time}\n\n`;

  // Show Resolution/Closing Date for Resolved or Rejected tickets
  if (['resolved', 'rejected'].includes(c.status)) {
    const closedDate = new Date(c.updated_at).toLocaleDateString('en-IN');
    const closedTime = new Date(c.updated_at).toLocaleTimeString('en-IN');
    const label = c.status === 'resolved' ? 'Resolution Date' : 'Closing Date';
    reportText += `${label}: ${closedDate} at ${closedTime}\n\n`;
  }

  if (c.admin_response) {
      reportText += `Admin Response: ${c.admin_response}\n\n`;
  }

  reportText += `Description: ${c.description}`;

  return {
    text: reportText,
    keyboard: { keyboard: [['📂 My Complaints'], ['🏠 Return to Dashboard']], resize_keyboard: true }
  };
};
