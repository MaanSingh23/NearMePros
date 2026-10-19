// Urgent problems Emergency Mode can dispatch a professional for, the service
// categories that handle them, and the words customers use to describe them
// (English, Hinglish, Hindi and Punjabi). Shared by the Emergency API and the AI assistant.
const EMERGENCY_TYPES = [
  {
    id: 'electrical',
    title: 'Electrical emergency',
    description: 'Sparking, burning smell, power failure, short circuit',
    categories: ['Electrical'],
    safety: 'Switch off the main power (MCB) if it is safe to reach. Do not touch sparking wires or switches with wet hands.',
    keywords: ['spark', 'sparking', 'short circuit', 'shock', 'current', 'burning smell', 'power cut', 'no power', 'no electricity', 'mcb trip', 'wire burn', 'bijli chali', 'bijli nahi', 'current lag', 'taar jal', 'बिजली', 'करंट', 'शॉर्ट सर्किट', 'ਬਿਜਲੀ', 'ਕਰੰਟ']
  },
  {
    id: 'plumbing',
    title: 'Water leak / burst pipe',
    description: 'Burst pipe, heavy leakage, flooding, overflowing tank',
    categories: ['Plumbing'],
    safety: 'Close the main water valve and switch off electricity in the wet area.',
    keywords: ['burst', 'pipe burst', 'flood', 'flooding', 'heavy leak', 'water everywhere', 'overflow', 'leaking badly', 'pipe phat', 'paani bhar', 'pani bhar', 'tanki overflow', 'पाइप फट', 'पानी भर', 'ਪਾਈਪ ਫਟ', 'ਪਾਣੀ ਭਰ']
  },
  {
    id: 'appliance',
    title: 'AC / appliance breakdown',
    description: 'AC, fridge, geyser or inverter failure needing urgent repair',
    categories: ['AC & Appliance Repair'],
    safety: 'Unplug the appliance. If you smell burning or see smoke, switch off the main power.',
    keywords: ['ac stopped', 'ac not working', 'fridge stopped', 'geyser leaking', 'inverter', 'appliance smoke', 'ac band', 'fridge band', 'एसी बंद', 'फ्रिज बंद', 'ਏਸੀ ਬੰਦ']
  },
  {
    id: 'lock',
    title: 'Locked out / door broken',
    description: 'Locked out, broken lock or door that will not close',
    categories: ['Carpentry'],
    safety: 'Stay in a safe, public place while you wait if you are locked out at night.',
    keywords: ['locked out', 'lock broken', 'key lost', 'door jammed', 'door broken', 'darwaza band', 'chabi kho', 'taala', 'दरवाज़ा', 'दरवाजा', 'ताला', 'चाबी', 'ਦਰਵਾਜ਼ਾ', 'ਤਾਲਾ']
  },
  {
    id: 'pest',
    title: 'Pest / bees / termites',
    description: 'Bee or wasp hive, rats, sudden infestation',
    categories: ['Pest Control'],
    safety: 'Keep children and pets away. Do not disturb a bee or wasp hive yourself.',
    keywords: ['bees', 'bee hive', 'wasp', 'honeycomb', 'rats', 'infestation', 'madhumakhi', 'मधुमक्खी', 'ततैया', 'चूहे', 'ਮੱਖੀਆਂ']
  },
  {
    id: 'cleaning',
    title: 'Urgent cleaning',
    description: 'Water damage, sewage overflow or spill clean-up',
    categories: ['Cleaning Services'],
    safety: 'Avoid contact with sewage water and keep the area ventilated.',
    keywords: ['sewage', 'gutter overflow', 'drain overflow', 'water damage', 'spill', 'gutter bhar', 'सीवर', 'गटर', 'ਸੀਵਰ']
  }
];

// Life-threatening situations: always point to official helplines first
const LIFE_THREATENING = /\b(fire|smoke|gas leak|gas smell|cylinder leak|lpg|electrocut|unconscious|bleeding|heart attack|accident|aag|aag lag)\b|आग|गैस लीक|गैस की गंध|ਅੱਗ|ਗੈਸ/i;
const URGENT_WORDS = /\b(urgent|urgently|emergency|asap|immediately|right now|jaldi|turant|abhi ke abhi|fauran|help me)\b|तुरंत|जल्दी|इमरजेंसी|ਤੁਰੰਤ|ਜਲਦੀ/i;

const findEmergencyType = (id) => EMERGENCY_TYPES.find((type) => type.id === id) || null;

/**
 * Looks for an urgent problem in a customer's message.
 * Returns { type, lifeThreatening } or null when it doesn't look urgent.
 */
const detectEmergency = (message) => {
  const text = String(message || '').toLowerCase();
  const lifeThreatening = LIFE_THREATENING.test(text);
  const type = EMERGENCY_TYPES.find((t) => t.keywords.some((k) => text.includes(k.toLowerCase())));
  if (type || lifeThreatening) return { type: type || null, lifeThreatening };
  if (URGENT_WORDS.test(text)) return { type: null, lifeThreatening: false };
  return null;
};

module.exports = { EMERGENCY_TYPES, findEmergencyType, detectEmergency };
