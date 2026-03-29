/**
 * PRODUCTION-GRADE NORMALIZATION LAYER
 * Handles titles, punctuation, and extra spaces for high-accuracy entity matching.
 */
export const normalize = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/(dr|mr|ms|mrs|prof|shri|smt)\.?\s+/gi, '') // Remove common titles
    .replace(/[.\-]/g, ' ')                            // Replace dots and hyphens with spaces
    .replace(/[^a-z0-9\s]/gi, '')                     // Remove special chars but Keep spaces
    .replace(/\s+/g, ' ')                             // Normalize extra spaces
    .trim();
};

/**
 * FUZZY MATCH LOGIC
 * Converts a query string into a permissive regex pattern.
 */
export const createFuzzyRegex = (query) => {
  const tokens = query.split(/\s+/).filter(t => t.length > 0);
  if (tokens.length === 0) return /$^/; // Matches nothing
  
  // Join tokens with .* to allow characters between them for typo tolerance
  // e.g., "ks srinivasan" -> /k.*s.*srinivasan/i
  const pattern = tokens.map(t => t.split('').join('.*')).join('.*');
  return new RegExp(pattern, 'i');
};
