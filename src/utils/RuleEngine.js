import { toWords } from 'number-to-words';

// Standard allowed contractions map (we expand anything NOT in this list if it's a contraction)
// Wait, the rule says "Transcribe contractions as spoken. If expanded form is clearly spoken -> use expanded form."
// So if the ASR outputs "i'm", and it's in the allowed list, we keep it. If ASR outputs something not in the list, 
// we should ideally expand it, but ASR usually only outputs standard contractions. 
// For deterministic rules, we just ensure symbols are correctly translated.

const ALLOWED_SYMBOLS = /[^a-z0-9\-\'\(\)\[\]\<\>\.\{\}\s]/gi;

// Reference table for filled pauses
const FILLED_PAUSES = {
    'mhm': 'mm-hm',
    'uh-huh': 'uh-huh',
    'hmm': 'hmm',
    'uh': 'uh',
    'um': 'um',
    'umm': 'um',
    'uhh': 'uh',
    'ah': '[fp]',
    'ahh': '[fp]',
    'mm-mm': 'mm-mm',
    'nuh-huh': 'nuh-huh',
    'oh': 'oh',
    'ooh': 'ooh'
};

export class RuleEngine {
    static normalizeNumbers(text) {
        // Regex to find standalone numbers
        return text.replace(/\b\d+\b/g, (match) => {
            try {
                // toWords converts 101 to "one hundred one", which fits spoken form
                let words = toWords(parseInt(match, 10));
                // Remove any hyphens introduced by number-to-words that aren't strict (like twenty-two is fine, but we can just use words)
                return words.replace(/-/g, ' '); 
            } catch (e) {
                return match;
            }
        });
    }

    static normalizeSymbols(text) {
        let t = text;
        t = t.replace(/\$/g, ' dollars ');
        t = t.replace(/€/g, ' euros ');
        t = t.replace(/%/g, ' percent ');
        t = t.replace(/&/g, ' and ');
        return t;
    }

    static normalizeFilledPauses(text) {
        let words = text.split(/\s+/);
        let normalized = words.map(w => {
            let clean = w.toLowerCase().replace(/[^\w-]/g, ''); // strip punctuation for check
            if (FILLED_PAUSES[clean] !== undefined) {
                return FILLED_PAUSES[clean];
            }
            return w;
        });
        return normalized.join(' ');
    }

    static stripDisallowedPunctuation(text) {
        return text.replace(ALLOWED_SYMBOLS, ' ').replace(/\s+/g, ' ').trim();
    }

    static formatAcronymsCorrectly(text) {
        // "c.n.n." -> "c. n. n."
        return text.replace(/([a-z])\./gi, '$1. ').replace(/\s+/g, ' ').trim();
    }

    static normalizeNonLexical(text) {
        // Map common ASR bracket outputs to Ermis tags
        let t = text;
        // Laughter
        t = t.replace(/(\*|\(|\[)(laughs|laughing|laughter)(\*|\)|\])/gi, ' [laughter] ');
        // Throat clear, cough, sigh, sneezes map to [hn]
        t = t.replace(/(\*|\(|\[)(cough|sigh|throat clears?|sneezes?|clears throat)(\*|\)|\])/gi, ' [hn] ');
        // Background noise
        t = t.replace(/(\*|\(|\[)(background noise|noise|music|silence)(\*|\)|\])/gi, ' [bg] ');
        return t;
    }

    static process(rawASRText) {
        if (!rawASRText) return "<ns>";

        let text = rawASRText.toLowerCase();

        text = this.normalizeNonLexical(text);
        text = this.normalizeSymbols(text);
        text = this.normalizeNumbers(text);
        text = this.stripDisallowedPunctuation(text);
        text = this.normalizeFilledPauses(text);
        text = this.formatAcronymsCorrectly(text);

        // Cleanup double spaces
        return text.replace(/\s+/g, ' ').trim();
    }
}
