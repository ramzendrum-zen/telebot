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
    embeddingModel: 'openai/text-embedding-3-small' // Configured for 1536-dim
  },

  // NVIDIA NIM — free-tier models via build.nvidia.com
  nvidia: {
    apiKey: process.env.NVIDIA_API_KEY,
    rerankerApiKey: process.env.NVIDIA_RERANKER_API_KEY,
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    models: {
      cheap: 'meta/llama-3.1-8b-instruct',   // Faster, stays under 10s
      advanced: 'meta/llama-3.3-70b-instruct', // Advanced reasoning
      reranker: 'nv-rerank-qa-mistral-4b:1'
    }
  },
  
  mongodb: {
    uri: process.env.MONGO_URI,
    dbName: process.env.DB_NAME || 'msajce',
    vectorCollection: 'vector_store', 
    entitiesCollection: 'entities_master', // NEW: For 100% accuracy people search
    vectorIndex: 'vector_index',
    sessionsCollection: 'user_sessions',
    usersCollection: 'users'
  },
  
  redis: {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
    ttl: parseInt(process.env.CACHE_TTL) || 3600 // 1 hour
  },
  
  rag: {
    recallLimit: 40,      // Pre-ranking pool size
    finalTopK: 20,         // Chunks passed to reasoning layer (up to 3k tokens)
    minConfidence: 4.0,   // Re-enabled strict confidence
    temperature: 0.1
  }
};

export default config;
