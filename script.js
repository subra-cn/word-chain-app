/*
 * Word Chain Generator
 *
 * This script implements the logic described in the specification:
 * - It accepts four groups of three uppercase letters from the user.
 * - It fetches a list of English words from GitHub (words_alpha.txt).
 * - It filters words that can be made from the provided letters without
 *   repeating the same group in succession.
 * - It uses a greedy algorithm to cover all unique letters with as few
 *   words as possible while chaining words together when possible.
 */

(function() {
  const DICT_URL =
    'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt';
  let dictionaryLoaded = false;
  let dictionary = [];

  const form = document.getElementById('wordForm');
  const output = document.getElementById('output');

  // Fetch the dictionary only once. Returns a promise that resolves when loaded.
  async function loadDictionary() {
    if (dictionaryLoaded) return;
    output.textContent = 'Fetching dictionary... (this may take a few seconds)';
    try {
      const response = await fetch(DICT_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch dictionary: ${response.status}`);
      }
      const text = await response.text();
      // Split by newline and filter out empty lines
      dictionary = text
        .split(/\r?\n/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0);
      dictionaryLoaded = true;
    } catch (err) {
      output.innerHTML = `<span class="error">Error loading dictionary: ${err.message}</span>`;
      throw err;
    }
  }

  /**
   * Build a mapping from each letter (character) to its group index.
   * If a letter appears in multiple groups, the first group wins.
   * @param {string[]} groups - array of four strings (each length 3)
   * @returns {Object} mapping char => groupIndex
   */
  function buildCharGroupMap(groups) {
    const map = {};
    groups.forEach((grp, idx) => {
      for (const ch of grp) {
        const upper = ch.toUpperCase();
        if (!(upper in map)) {
          map[upper] = idx;
        }
      }
    });
    return map;
  }

  /**
   * Determine if a word is valid based on the group mapping and constraints.
   * - All characters must be in charGroupMap.
   * - No two consecutive characters may belong to the same group.
   * @param {string} word - candidate word (already uppercase)
   * @param {Object} charGroupMap - mapping of char -> group index
   * @returns {Object|null} returns an object with properties if valid; otherwise null
   */
  function validateWord(word, charGroupMap) {
    const letters = word.toUpperCase().split('');
    const groups = [];
    for (const ch of letters) {
      const grp = charGroupMap[ch];
      if (grp === undefined) return null; // contains a letter not in any group
      groups.push(grp);
    }
    // Check consecutive groups: no same group consecutively
    for (let i = 0; i < groups.length - 1; i++) {
      if (groups[i] === groups[i + 1]) {
        return null;
      }
    }
    // Build coverage set of unique letters used in this word
    const coverage = new Set(letters);
    return {
      word: word.toUpperCase(),
      first: letters[0],
      last: letters[letters.length - 1],
      coverage: coverage
    };
  }

  /**
   * Filter the global dictionary into candidate words based on the groups.
   * Limits to words up to a certain length for performance (default 12).
   * @param {Object} charGroupMap
   * @param {number} maxLength
   * @returns {Array}
   */
  function buildCandidateWords(charGroupMap, maxLength = 12) {
    const candidates = [];
    for (const w of dictionary) {
      if (w.length === 0 || w.length > maxLength) continue;
      const val = validateWord(w, charGroupMap);
      if (val) candidates.push(val);
    }
    return candidates;
  }

  /**
   * Greedy algorithm to construct a sequence of words covering all letters.
   * @param {string[]} groups - four group strings (uppercase)
   * @returns {string[]} array of selected words
   */
  function generateWordSequence(groups) {
    const charGroupMap = buildCharGroupMap(groups);
    const allLetters = new Set();
    groups.forEach((grp) => {
      for (const ch of grp) allLetters.add(ch.toUpperCase());
    });
    const candidates = buildCandidateWords(charGroupMap, 12);
    if (candidates.length === 0) {
      return [];
    }
    // Sort candidates descending by number of unique letters covered, then by length (descending)
    candidates.sort((a, b) => {
      const aCov = a.coverage.size;
      const bCov = b.coverage.size;
      if (bCov !== aCov) return bCov - aCov;
      // If equal coverage, prefer longer words
      return b.word.length - a.word.length;
    });
    const uncovered = new Set(allLetters);
    const usedWords = new Set();
    const result = [];
    let currentLast = null;
    while (uncovered.size > 0) {
      let chosen = null;
      // If we already have a chain, restrict to words that start with currentLast
      const candidateList = candidates.filter((item) => !usedWords.has(item.word) && (currentLast === null || item.first === currentLast));
      // Try to pick one that covers as many uncovered letters as possible
      let maxCoverage = -1;
      for (const item of candidateList) {
        let newCoverage = 0;
        item.coverage.forEach((ch) => {
          if (uncovered.has(ch)) newCoverage++;
        });
        if (newCoverage > maxCoverage) {
          maxCoverage = newCoverage;
          chosen = item;
        }
      }
      // If we couldn't find a covering word but have candidateList, pick the first in sorted order
      if (!chosen && candidateList.length > 0) {
        chosen = candidateList[0];
      }
      // If no word fits the current chain (candidateList empty) and we've used some words already, break to avoid infinite loop
      if (!chosen) {
        break;
      }
      result.push(chosen.word);
      usedWords.add(chosen.word);
      // Remove letters covered by this word from uncovered
      chosen.coverage.forEach((ch) => uncovered.delete(ch));
      currentLast = chosen.last;
    }
    return result;
  }

  // Event handler for form submission
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    // Read and uppercase groups
    const g1 = document.getElementById('group1').value.trim().toUpperCase();
    const g2 = document.getElementById('group2').value.trim().toUpperCase();
    const g3 = document.getElementById('group3').value.trim().toUpperCase();
    const g4 = document.getElementById('group4').value.trim().toUpperCase();
    // Validate inputs: exactly 3 alphabetic characters each
    const regex = /^[A-Z]{3}$/;
    if (!regex.test(g1) || !regex.test(g2) || !regex.test(g3) || !regex.test(g4)) {
      output.innerHTML = '<span class="error">All four groups must contain exactly three letters A‑Z.</span>';
      return;
    }
    // Load dictionary if not loaded
    try {
      await loadDictionary();
    } catch (err) {
      // Error message already displayed
      return;
    }
    // Generate sequence
    const sequence = generateWordSequence([g1, g2, g3, g4]);
    if (sequence.length === 0) {
      output.innerHTML = '<span class="error">No suitable words found for these letters. Try different combinations.</span>';
    } else {
      output.innerHTML = `<strong>Generated Words:</strong>\n${sequence.join(', ')}`;
      // If not all letters were covered, show which letters remain
      const allLetters = new Set((g1 + g2 + g3 + g4).split(''));
      const covered = new Set();
      sequence.forEach((word) => {
        for (const ch of word) covered.add(ch.toUpperCase());
      });
      const remaining = [];
      allLetters.forEach((ch) => {
        if (!covered.has(ch)) remaining.push(ch);
      });
      if (remaining.length > 0) {
        output.innerHTML += `\n\n<span class="error">Warning: Some letters were not used: ${remaining.join(', ')}</span>`;
      }
    }
  });
})();