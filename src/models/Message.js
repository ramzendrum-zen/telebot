const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId: { type: Number, required: true },
  userMessage: { type: String, required: true },
  botReply: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
