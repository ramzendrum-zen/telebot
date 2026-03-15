import User from '../database/models/User.js';
import logger from '../utils/logger.js';

/**
 * Finds a user by telegram ID or creates a new one.
 */
export const getOrCreateUser = async (chatId, message = {}) => {
  try {
    let user = await User.findOne({ telegram_id: chatId });
    if (!user) {
      const { username, first_name, last_name } = message.from || {};
      user = new User({ 
        telegram_id: chatId,
        telegram_username: username,
        telegram_first_name: first_name,
        telegram_last_name: last_name
      });
      await user.save();
    }
    return user;
  } catch (error) {
    logger.error(`Error in getOrCreateUser: ${error.message}`);
    return null;
  }
};

/**
 * Updates user verification details.
 */
export const verifyUser = async (telegramId, details) => {
  try {
    const user = await User.findOneAndUpdate(
      { telegram_id: telegramId },
      { ...details, verified: true },
      { new: true }
    );
    return user;
  } catch (error) {
    logger.error(`Error in verifyUser: ${error.message}`);
    return null;
  }
};
