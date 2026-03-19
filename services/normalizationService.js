/**
 * Normalizes user queries for consistent caching and keyword matching.
 */
export const normalizeQueryBasic = (query) => {
  let q = query.toLowerCase().trim();
  
  // Remove special characters, keep alphanumeric and basic spaces
  q = q.replace(/[^\w\s-]/g, '');
  
  // Replace common fillers
  const stopWords = ['please', 'can', 'you', 'tell', 'me', 'about', 'a', 'an', 'the', 'is', 'who', 'what', 'where', 'how', 'which', 'give', 'any', 'to', 'for', 'in', 'on', 'with', 'will', 'go'];
  
  // Fix abbreviations specific to MSAJCE
  const abbreviations = {
    'abt': 'about',
    'msajce': 'college',
    'ar8': 'ar-8',
    'ar-8': 'ar-8',
    'cst': 'computer science',
    'cse': 'computer science',
    'ece': 'electronics',
    'eee': 'electrical',
    'it': 'information technology',
    'mech': 'mechanical',
    'civil': 'civil engineering',
    'ai': 'artificial intelligence',
    'aiml': 'artificial intelligence',
    'cs': 'cyber security',
    'hod': 'head of department',
    'prin': 'principal',
    'loc': 'location',
    'lib': 'library'
  };

  let words = q.split(/\s+/);
  
  // Apply abbreviation expansion, but don't strictly remove stopwords yet if they change the meaning.
  // The goal is just spelling alignment and standardizing formats.
  words = words.map(w => {
    // Standardize ar1, ar3, r22 -> ar-1, ar-3, r-22 using regex
    if (/^[ar]+\d+$/i.test(w)) return w.replace(/^([a-z]+)(\d+)$/i, '$1-$2');
    return abbreviations[w] || w;
  });
  
  // For caching, create a strictly normalized string omitting filler words
  const strictWords = words.filter(w => !stopWords.includes(w) && w.length > 0);
  
  const cacheKey = strictWords.length > 0 ? strictWords.join('_') : words.join('_');
  const normalizedText = words.join(' ');

  return { normalizedText, cacheKey };
};
