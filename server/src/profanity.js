'use strict';

/**
 * Deliberately small, conservative profanity filter. This is a road-safety /
 * decency guard for text bound for a public-facing screen, not a content
 * moderation system. It masks whole-word matches (and common leetspeak
 * substitutions) with asterisks, preserving length.
 *
 * Extend `WORDS` for your locale. Matching is case-insensitive and only fires
 * on word boundaries so "assistant" or "class" are never touched.
 */
const WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'piss', 'crap',
  'cunt', 'slut', 'whore', 'damn', 'prick',
];

// Map look-alike characters back to letters before testing a word.
const LEET = { '@': 'a', '4': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '$': 's', '5': 's', '7': 't' };

function normalizeWord(word) {
  return word.toLowerCase().replace(/[@43105$!7]/g, (c) => LEET[c] || c);
}

const wordSet = new Set(WORDS);

/**
 * Returns { clean, flagged } where `clean` has offending words masked.
 */
function filter(text) {
  let flagged = false;
  const clean = String(text).replace(/[\p{L}\p{N}@!$]+/gu, (token) => {
    if (wordSet.has(normalizeWord(token))) {
      flagged = true;
      return '*'.repeat(token.length);
    }
    return token;
  });
  return { clean, flagged };
}

module.exports = { filter };
