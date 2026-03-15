import { getCache, setCache } from './cacheService.js';
import Complaint from '../database/models/Complaint.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'eventbooking.otp@gmail.com',
    pass: 'bcfr ckfv emwp vwbi'
  }
});

const COMPLAINT_STATE_PREFIX = 'complaint_state:';

/**
 * Handles the non-AI complaint state machine.
 */
export const handleComplaintFlow = async (chatId, text) => {
  const stateKey = `${COMPLAINT_STATE_PREFIX}${chatId}`;
  const stateData = await getCache(stateKey) || { step: 'init' };

  let response = "";
  let nextState = { ...stateData };

  // 1. Initial Trigger
  if (text.toLowerCase() === '/complaint' || text.toLowerCase() === '/start' || stateData.step === 'init') {
    response = `**MSAJCE Official Grievance Redressal System** 📝

This is a structured portal to register your complaints. No AI is used here—your input is sent directly to the administration.

**Use this bot for:**
• 🏛️ **Campus** Facilities
• 🏠 **Hostel** & Dining
• 📚 **Academic** Issues

Please provide your **Full Name** to begin:`;
    nextState = { step: 'asking_name' };
  } 
  // 2. Capture Name -> Ask Roll Number
  else if (stateData.step === 'asking_name') {
    nextState.name = text;
    nextState.step = 'asking_roll';
    response = `Thank you, **${text}**. \n\nPlease provide your **Roll Number** (or type 'skip' to skip):`;
  }
  // 3. Capture Roll -> Ask Issue
  else if (stateData.step === 'asking_roll') {
    nextState.rollNumber = text.toLowerCase() === 'skip' ? 'N/A' : text;
    nextState.step = 'asking_issue';
    response = "Finally, please describe your **Complaint or Issue** in detail:";
  }
  // 4. Capture Issue -> Save to DB -> End
  else if (stateData.step === 'asking_issue') {
    try {
      const newComplaint = new Complaint({
        chatId: chatId,
        name: nextState.name,
        rollNumber: nextState.rollNumber,
        issue: text
      });
      await newComplaint.save();
      
      try {
        await transporter.sendMail({
          from: 'eventbooking.otp@gmail.com',
          to: 'cookwithcomali5@gmail.com',
          subject: `New Grievance Submitted by ${nextState.name}`,
          text: `A new grievance has been submitted:\n\nName: ${nextState.name}\nRoll Number: ${nextState.rollNumber}\nIssue:\n${text}`
        });
        logger.info(`Complaint email sent successfully for ${nextState.name}`);
      } catch (err) {
        logger.error(`Error sending complaint email: ${err.message}`);
      }

      response = "✅ **Complaint Registered Successfully!**\n\nYour grievance has been captured and sent to the college administration for review. \n\nIs there anything else I can help you with?";
      nextState = null; // Clear state
    } catch (error) {
      logger.error(`Error saving complaint: ${error.message}`);
      response = "❌ Sorry, I encountered an error while saving your complaint. Please try again later or contact the admission office directly.";
      nextState = null;
    }
  }

  // Save next state or clear it
  if (nextState) {
    await setCache(stateKey, nextState);
  } else {
    // In a real app, you'd want a 'del' method in cacheService. 
    // For now, we set a very short TTL or null.
    await setCache(stateKey, null); 
  }

  return response;
};

/**
 * Checks if a user is currently in a complaint session.
 */
export const isInComplaintFlow = async (chatId) => {
  const stateKey = `${COMPLAINT_STATE_PREFIX}${chatId}`;
  const state = await getCache(stateKey);
  return state !== null;
};
