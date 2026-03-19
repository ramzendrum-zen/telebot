/**
 * Normalizes user queries for consistent caching and keyword matching.
 */
export const normalizeQueryBasic = (query) => {
  let q = query.toLowerCase().trim();
  
  // Remove special characters, keep alphanumeric and basic spaces
  q = q.replace(/[^\w\s-]/g, '');
  
  // Common typos and informal abbreviations
  const abbreviations = {
    // Informal speech
    'fr': 'for', 'abt': 'about', 'wats': 'what is', 'wat': 'what',
    'gimme': 'give me', 'plz': 'please', 'pls': 'please',
    'hw': 'how', 'r': 'are', 'u': 'you', 'ur': 'your',
    // Common typos
    'drver': 'driver', 'drvr': 'driver', 'driv': 'driver',
    'phn': 'phone', 'ph': 'phone', 'phno': 'phone',
    'contct': 'contact', 'cntct': 'contact', 'cnt': 'contact',
    'dtls': 'details', 'det': 'details', 'detl': 'details',
    'info': 'information', 'nmbr': 'number', 'num': 'number',
    'no': 'number', // contextual — kept for route ambiguity
    'admsn': 'admission', 'dept': 'department',
    // MSAJCE specific
    'msajce': 'college', 'msaj': 'college',
    'ar8': 'ar-8', 'ar5': 'ar-5', 'ar6': 'ar-6', 'ar7': 'ar-7',
    'ar1': 'ar-1', 'ar2': 'ar-2', 'ar3': 'ar-3', 'ar4': 'ar-4',
    'ar9': 'ar-9', 'ar10': 'ar-10', 'ar11': 'ar-11', 'ar12': 'ar-12',
    'r22': 'r-22', 'r5': 'r-5',
    // Department abbreviations
    'cst': 'computer science', 'cse': 'CSE', 'ece': 'ECE',
    'eee': 'EEE', 'it': 'IT', 'mech': 'mechanical',
    'civil': 'civil engineering', 'ai': 'AI', 'aiml': 'AI ML',
    'cs': 'cyber security', 'hod': 'head of department',
    'prin': 'principal', 'loc': 'location', 'lib': 'library',
    // Geographic Neighborhoods (Mapping to parent search terms)
    'thoraipakkam': 'Thoraipakkam OMR', 'perungudi': 'Perungudi OMR',
    'thorpakam': 'Thoraipakkam OMR', 'karapakkam': 'Karapakkam OMR',
    'blue star': 'Anna Nagar', 'thirumangalam': 'Anna Nagar',
    'skywalk': 'Anna Nagar', 'ramachandra': 'Porur',
    'vijaya nagar': 'Velachery', 'kasi': 'Kasi Theatre',
  };

  let words = q.split(/\s+/);
  
  // Apply abbreviation expansion, but don't strictly remove stopwords yet if they change the meaning.
  // The goal is just spelling alignment and standardizing formats.
  words = words.map(w => {
    // Standardize ar1, ar3, r22 → ar-1, ar-3, r-22 using regex
    if (/^(ar|r)\d+$/i.test(w)) return w.replace(/^([a-z]+)(\d+)$/i, '$1-$2');
    return abbreviations[w] || w;
  });
  
  // Stop words for cache key only
  const stopWords = ['please', 'can', 'you', 'tell', 'me', 'about', 'a', 'an', 'the', 'is', 'who', 'what', 'where', 'how', 'which', 'give', 'any', 'to', 'for', 'in', 'on', 'with', 'will', 'go'];
  
  const strictWords = words.filter(w => !stopWords.includes(w) && w.length > 0);
  
  const cacheKey = strictWords.length > 0 ? strictWords.join('_') : words.join('_');
  const normalizedText = words.join(' ');

  return { normalizedText, cacheKey };
};
