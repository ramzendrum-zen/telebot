import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    complaintBotToken: process.env.COMPLAINT_BOT_TOKEN,
    webhookUrl: process.env.WEBHOOK_URL,
  },
  
  email: {
    user: process.env.EMAIL_USER || 'eventbooking.otp@gmail.com',
    pass: process.env.EMAIL_PASS || 'bcfr ckfv emwp vwbi'
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'dzqcuxchc',
    apiKey: process.env.CLOUDINARY_API_KEY || '771675394986651',
    apiSecret: process.env.CLOUDINARY_API_SECRET || 'eBFjmujdu4yvlfGmPs2N-Z31CjI'
  },
  
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    models: {
      cheap: 'google/gemini-2.0-flash-001', 
      advanced: 'meta-llama/llama-3.3-70b-instruct',
      embedding: 'openai/text-embedding-3-small',
      reranker: 'bge-reranker-large' // Or specific API endpoint if using external service
    }
  },
  
  mongodb: {
    uri: process.env.MONGO_URI,
    dbName: process.env.DB_NAME || 'msajce',
    vectorCollection: process.env.VECTOR_COLLECTION || 'vector_store',
    vectorIndex: 'vector_index'
  },
  
  redis: {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
    ttl: parseInt(process.env.CACHE_TTL) || 3600 // 1 hour
  },
  
  rag: {
    topK: 20, // Used for initial hybrid retrieval
    finalTopK: 5, // After reranking
    maxContextTokens: 3000,
    similarityThreshold: 0.7,
    faqSimilarityThreshold: 0.9, // Semantic cache threshold
    temperature: 0.1 // Stay factual
  }
};

export default config;
