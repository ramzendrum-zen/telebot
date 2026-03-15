import User from '../database/models/User.js';
import logger from '../utils/logger.js';

/**
 * Finds a user by telegram ID or creates a new one.
 */
export const getOrCreateUser = async (telegramId) => {
  try {
    let user = await User.findOne({ telegram_id: telegramId });
    if (!user) {
      user = new User({ telegram_id: telegramId });
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
