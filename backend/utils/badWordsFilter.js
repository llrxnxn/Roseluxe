const badWords = [
  'fucking',
  'fuck off',
  'shit',
  'stupid',
  'fuck',
  'ass',
  'damn',
  'crap',
  'asshole',
  'bitch',
  'bastard',
];


exports.filterBadWords = (text) => {
  if (!text || typeof text !== 'string') {
    return text;
  }

  console.log('🔍 BEFORE FILTER:', text); // DEBUG

  let filtered = text;

  // Sort by length descending (longer words first)
  const sortedWords = [...badWords].sort((a, b) => b.length - a.length);

  sortedWords.forEach((word) => {
    const pattern = new RegExp(word.replace(/\s+/g, '\\s+'), 'gi');
    
    filtered = filtered.replace(pattern, (match) => {
      const replacement = '*'.repeat(match.length);
      console.log(`   Replaced "${match}" with "${replacement}"`); // DEBUG
      return replacement;
    });
  });

  console.log('✅ AFTER FILTER:', filtered); // DEBUG
  return filtered;
};

// Test it locally:
if (require.main === module) {
  const tests = [
    'this is shit',
    'FUCK YOU!',
    'what the fuck',
    'you are stupid',
    'fuck off mate',
    'This is fucking amazing',
  ];

  tests.forEach((test) => {
    console.log(`\n"${test}" → "${exports.filterBadWords(test)}"`);
  });
}