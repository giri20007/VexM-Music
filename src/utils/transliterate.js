/**
 * High-performance, offline Indic Script Transliterator for Vex-M
 * Transliterates Tamil, Hindi (Devanagari), Telugu, Malayalam, and Kannada
 * into phonetic Roman/Latin script (Tanglish, Hinglish, Tenglish, etc.)
 */

export function detectScript(text = '') {
  if (!text) return null;
  if (/[\u0B80-\u0BFF]/.test(text)) return { code: 'ta', native: 'தமிழ்', roman: 'Tanglish' };
  if (/[\u0900-\u097F]/.test(text)) return { code: 'hi', native: 'हिंदी', roman: 'Hinglish' };
  if (/[\u0C00-\u0C7F]/.test(text)) return { code: 'te', native: 'తెలుగు', roman: 'Tenglish' };
  if (/[\u0D00-\u0D7F]/.test(text)) return { code: 'ml', native: 'മലയാളം', roman: 'Manglish' };
  if (/[\u0C80-\u0CFF]/.test(text)) return { code: 'kn', native: 'ಕನ್ನಡ', roman: 'Kanglish' };
  return null;
}

const tamilVowels = {
  'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ee', 'உ': 'u', 'ஊ': 'oo',
  'எ': 'e', 'ஏ': 'ae', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oa', 'ஔ': 'au', 'ஃ': 'k'
};
const tamilConsonants = {
  'க': 'ka', 'ங': 'nga', 'ச': 'cha', 'ஞ': 'nja', 'ட': 'ta', 'ண': 'na',
  'த': 'tha', 'ந': 'na', 'ப': 'pa', 'ம': 'ma', 'ய': 'ya', 'ர': 'ra',
  'ல': 'la', 'வ': 'va', 'ழ': 'zha', 'ள': 'la', 'ற': 'ra', 'ன': 'na',
  'ஜ': 'ja', 'ஷ': 'sha', 'ஸ': 'sa', 'ஹ': 'ha', 'க்ஷ': 'ksha'
};
const tamilSigns = {
  'ா': 'aa', 'ி': 'i', 'ீ': 'ee', 'ு': 'u', 'ூ': 'oo',
  'ெ': 'e', 'ே': 'ae', 'ை': 'ai', 'ொ': 'o', 'ோ': 'oa', 'ௌ': 'au'
};

const devVowels = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऋ': 'ri'
};
const devConsonants = {
  'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'ङ': 'nga',
  'च': 'cha', 'छ': 'chha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'nya',
  'ट': 'ta', 'ठ': 'tha', 'ड': 'da', 'ढ': 'dha', 'ण': 'na',
  'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
  'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
  'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va', 'श': 'sha',
  'ष': 'sha', 'स': 'sa', 'ह': 'ha', 'क्ष': 'ksha', 'त्र': 'tra', 'ज्ञ': 'gya'
};
const devSigns = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ृ': 'ri', 'ं': 'n', 'ँ': 'n', 'ः': 'h'
};

const telVowels = {
  'అ': 'a', 'ఆ': 'aa', 'ఇ': 'i', 'ఈ': 'ee', 'ఉ': 'u', 'ఊ': 'oo',
  'ఎ': 'e', 'ఏ': 'ae', 'ఐ': 'ai', 'ఒ': 'o', 'ఓ': 'oa', 'ఔ': 'au'
};
const telConsonants = {
  'క': 'ka', 'ఖ': 'kha', 'గ': 'ga', 'ఘ': 'gha', 'ఙ': 'nga',
  'చ': 'cha', 'ఛ': 'chha', 'జ': 'ja', 'ఝ': 'jha', 'ఞ': 'nya',
  'ట': 'ta', 'ఠ': 'tha', 'డ': 'da', 'ఢ': 'dha', 'ణ': 'na',
  'త': 'ta', 'థ': 'tha', 'ద': 'da', 'ధ': 'dha', 'న': 'na',
  'ప': 'pa', 'ఫ': 'pha', 'బ': 'ba', 'భ': 'bha', 'మ': 'ma',
  'య': 'ya', 'ర': 'ra', 'ల': 'la', 'వ': 'va', 'శ': 'sha',
  'ష': 'sha', 'స': 'sa', 'హ': 'ha', 'ళ': 'la', 'క్ష': 'ksha'
};
const telSigns = {
  'ా': 'aa', 'ి': 'i', 'ీ': 'ee', 'ు': 'u', 'ూ': 'oo',
  'ె': 'e', 'ే': 'ae', 'ై': 'ai', 'ొ': 'o', 'ో': 'oa', 'ౌ': 'au', 'ం': 'm'
};

const mlVowels = {
  'അ': 'a', 'ആ': 'aa', 'ഇ': 'i', 'ഈ': 'ee', 'ഉ': 'u', 'ഊ': 'oo',
  'എ': 'e', 'ഏ': 'ae', 'ഐ': 'ai', 'ഒ': 'o', 'ഓ': 'oa', 'ഔ': 'au'
};
const mlConsonants = {
  'ക': 'ka', 'ഖ': 'kha', 'ഗ': 'ga', 'ഘ': 'gha', 'ങ': 'nga',
  'ച': 'cha', 'ഛ': 'chha', 'ജ': 'ja', 'ഝ': 'jha', 'ഞ': 'nya',
  'ട': 'ta', 'ഠ': 'tha', 'ഡ': 'da', 'ഢ': 'dha', 'ണ': 'na',
  'ത': 'ta', 'ഥ': 'tha', 'ദ': 'da', 'ധ': 'dha', 'ന': 'na',
  'പ': 'pa', 'ഫ': 'pha', 'ബ': 'ba', 'ഭ': 'bha', 'മ': 'ma',
  'യ': 'ya', 'ര': 'ra', 'ല': 'la', 'വ': 'va', 'ശ': 'sha',
  'ഷ': 'sha', 'സ': 'sa', 'ഹ': 'ha', 'ള': 'la', 'ഴ': 'zha'
};
const mlSigns = {
  'ാ': 'aa', 'ി': 'i', 'ീ': 'ee', 'ു': 'u', 'ൂ': 'oo',
  'െ': 'e', 'േ': 'ae', 'ൈ': 'ai', 'ൊ': 'o', 'ോ': 'oa', 'ൌ': 'au', 'ം': 'm'
};

const knVowels = {
  'ಅ': 'a', 'ಆ': 'aa', 'ಇ': 'i', 'ಈ': 'ee', 'ಉ': 'u', 'ಊ': 'oo',
  'ಎ': 'e', 'ಏ': 'ae', 'ಐ': 'ai', 'ಒ': 'o', 'ಓ': 'oa', 'ಔ': 'au'
};
const knConsonants = {
  'ಕ': 'ka', 'ಖ': 'kha', 'ಗ': 'ga', 'ಘ': 'gha', 'ಙ': 'nga',
  'ಚ': 'cha', 'ಛ': 'chha', 'ಜ': 'ja', 'ಝ': 'jha', 'ಞ': 'nya',
  'ಟ': 'ta', 'ಠ': 'tha', 'ಡ': 'da', 'ಢ': 'dha', 'ಣ': 'na',
  'ತ': 'ta', 'ಥ': 'tha', 'ದ': 'da', 'ಧ': 'dha', 'ನ': 'na',
  'ಪ': 'pa', 'ಫ': 'pha', 'ಬ': 'ba', 'ಭ': 'bha', 'ಮ': 'ma',
  'ಯ': 'ya', 'ರ': 'ra', 'ಲ': 'la', 'ವ': 'va', 'ಶ': 'sha',
  'ಷ': 'sha', 'ಸ': 'sa', 'ಹ': 'ha', 'ಳ': 'la', 'ಕ್ಷ': 'ksha'
};
const knSigns = {
  'ಾ': 'aa', 'ಿ': 'i', 'ೀ': 'ee', 'ು': 'u', 'ೂ': 'oo',
  'ೆ': 'e', 'ೇ': 'ae', 'ೈ': 'ai', 'ೊ': 'o', 'ೋ': 'oa', 'ೌ': 'au', 'ಂ': 'm'
};

export function transliterateIndicToRoman(text = '') {
  if (!text) return '';

  let out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const code = c.charCodeAt(0);

    // Tamil
    if (code >= 0x0B80 && code <= 0x0BFF) {
      if (tamilVowels[c]) out += tamilVowels[c];
      else if (tamilConsonants[c]) {
        let base = tamilConsonants[c].slice(0, -1);
        const next = text[i + 1];
        if (next === '்') { out += base; i++; }
        else if (tamilSigns[next]) { out += base + tamilSigns[next]; i++; }
        else { out += base + 'a'; }
      } else out += c;
    }
    // Devanagari (Hindi)
    else if (code >= 0x0900 && code <= 0x097F) {
      if (devVowels[c]) out += devVowels[c];
      else if (devConsonants[c]) {
        let base = devConsonants[c].slice(0, -1);
        const next = text[i + 1];
        if (next === '्') { out += base; i++; }
        else if (devSigns[next]) { out += base + devSigns[next]; i++; }
        else { out += base + 'a'; }
      } else out += c;
    }
    // Telugu
    else if (code >= 0x0C00 && code <= 0x0C7F) {
      if (telVowels[c]) out += telVowels[c];
      else if (telConsonants[c]) {
        let base = telConsonants[c].slice(0, -1);
        const next = text[i + 1];
        if (next === '్') { out += base; i++; }
        else if (telSigns[next]) { out += base + telSigns[next]; i++; }
        else { out += base + 'a'; }
      } else out += c;
    }
    // Malayalam
    else if (code >= 0x0D00 && code <= 0x0D7F) {
      if (mlVowels[c]) out += mlVowels[c];
      else if (mlConsonants[c]) {
        let base = mlConsonants[c].slice(0, -1);
        const next = text[i + 1];
        if (next === '്') { out += base; i++; }
        else if (mlSigns[next]) { out += base + mlSigns[next]; i++; }
        else { out += base + 'a'; }
      } else out += c;
    }
    // Kannada
    else if (code >= 0x0C80 && code <= 0x0CFF) {
      if (knVowels[c]) out += knVowels[c];
      else if (knConsonants[c]) {
        let base = knConsonants[c].slice(0, -1);
        const next = text[i + 1];
        if (next === '್') { out += base; i++; }
        else if (knSigns[next]) { out += base + knSigns[next]; i++; }
        else { out += base + 'a'; }
      } else out += c;
    }
    else {
      out += c;
    }
  }

  return out;
}
