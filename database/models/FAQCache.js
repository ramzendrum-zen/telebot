import mongoose from 'mongoose';

const faqCacheSchema = new mongoose.Schema({
  normalized_question: { type: String, required: true, unique: true },
  embedding: { type: [Number], required: true }, // 1536 dim
  answer: { type: String, required: true },
  usage_count: { type: Number, default: 1 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Update timestamp on modifying
faqCacheSchema.pre('save', function() {
  this.updated_at = Date.now();
});

const FAQCache = mongoose.models.FAQCache || mongoose.model('FAQCache', faqCacheSchema);
export default FAQCache;
