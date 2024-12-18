// Simple string similarity calculation using Levenshtein distance
export function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) {
      costs[s2.length] = lastValue;
    }
  }
  
  const maxLength = Math.max(s1.length, s2.length);
  const similarity = (maxLength - costs[s2.length]) / maxLength;
  return similarity;
}

export function findSimilarCategories(newCategory, existingCategories, threshold = 0.7) {
  return existingCategories
    .map(category => ({
      category,
      similarity: calculateSimilarity(newCategory, category)
    }))
    .filter(({ similarity }) => similarity > threshold)
    .sort((a, b) => b.similarity - a.similarity);
}
