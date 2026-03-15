/**
 * Detects the user's intent based on keywords and patterns.
 */
export const detectIntent = (query) => {
  const q = query.toLowerCase();
  
  if (/\b(bus|route|stop|driver|timing|travel|transport|reach|go to|ar-?\d+|r-?\d+)\b/.test(q)) {
    return 'transport';
  }
  
  if (/\b(who is|principal|hod|professor|dr\.|faculty|staff|dean|leader|boss|runs|control|top person|head of)\b/.test(q)) {
    return 'faculty';
  }

  if (/\b(fee|admission|cutoff|placement|recruit|package|salary|job|cost|scholarship)\b/.test(q)) {
    return 'admission_placement';
  }
  
  return 'general';
};

/**
 * Normalizes common variations in college terminology.
 */
export const normalizeQuery = (query) => {
  let q = query.toLowerCase().trim();
  
  // Handle AR8/AR-8 variations
  q = q.replace(/ar\s?(\d+)/g, 'ar-$1');
  q = q.replace(/r\s?(\d+)/g, 'r-$1');
  
  // Common nicknames/shorthand
  // Removing hardcoded 'ram' -> 'ramanathan' as it lacks data support
  
  return q;
};
