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

  // Global state for the current session
  let currentGroups = [];
  let currentCharGroupMap = {};
  let currentCandidates = [];
  let allLetters = new Set();
  let currentSequence = [];

  // Set of words that have been explicitly discarded by the user. These words
  // will not be used in subsequent generation attempts until the user resets.
  let discardedWords = new Set();

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
   * Prepare global state for the provided groups. This builds the
   * character->group mapping, the set of all letters, and the list of
   * valid candidate words sorted by coverage and length.
   * @param {string[]} groups - four group strings (uppercase)
   */
  function prepareForGroups(groups) {
    currentGroups = groups;
    currentCharGroupMap = buildCharGroupMap(groups);
    // Build set of all letters
    allLetters = new Set();
    groups.forEach((grp) => {
      for (const ch of grp) allLetters.add(ch.toUpperCase());
    });
    // Build and sort candidate words
    currentCandidates = buildCandidateWords(currentCharGroupMap, 12);
    // Sort candidates descending by number of unique letters covered, then by length (descending)
    currentCandidates.sort((a, b) => {
      const aCov = a.coverage.size;
      const bCov = b.coverage.size;
      if (bCov !== aCov) return bCov - aCov;
      // If equal coverage, prefer longer words
      return b.word.length - a.word.length;
    });
  }

  /**
   * Generate a sequence of words from the current global state. You can supply
   * an initial last letter (to continue a chain), a set of letters that are
   * still uncovered, and a set of words to avoid (used previously). If no
   * uncovered set is provided, all letters will be considered uncovered.
   * @param {string|null} startingLast
   * @param {Set<string>|null} uncoveredSet
   * @param {Set<string>|null} usedWordsSet
   * @returns {string[]} array of words in the generated sequence
   */
  function generateSequenceFromState(startingLast = null, uncoveredSet = null, usedWordsSet = null) {
    const uncovered = uncoveredSet ? new Set(uncoveredSet) : new Set(allLetters);
    // Combine used words with globally discarded words to ensure none are reused
    let used;
    if (usedWordsSet) {
      used = new Set([...usedWordsSet, ...discardedWords]);
    } else {
      used = new Set(discardedWords);
    }
    const result = [];
    let currentLast = startingLast;
    // Continue until all uncovered letters are covered or no candidate can be chosen
    while (uncovered.size > 0) {
      let chosen = null;
      // Restrict to words that start with currentLast if not null
      const candidateList = currentCandidates.filter(
        (item) => !used.has(item.word) && (currentLast === null || item.first === currentLast)
      );
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
      // If no candidate covers new letters but some exist, pick the first
      if (!chosen && candidateList.length > 0) {
        chosen = candidateList[0];
      }
      if (!chosen) {
        break;
      }
      result.push(chosen.word);
      used.add(chosen.word);
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
    // Prepare global state for these groups
    prepareForGroups([g1, g2, g3, g4]);
    // Generate initial sequence
    const seq = generateSequenceFromState(null, null, null);
    currentSequence = seq;
    // Render the sequence as clickable words
    renderSequence();
  });

  // Attach reset button handler
  const resetBtn = document.getElementById('resetBtn');
  resetBtn.addEventListener('click', resetAll);

  /**
   * Reset the application: clears discarded words, clears the current sequence,
   * empties the input fields, and clears the output display.
   */
  function resetAll() {
    // Clear group input fields
    ['group1', 'group2', 'group3', 'group4'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    // Clear state
    discardedWords.clear();
    currentSequence = [];
    // Clear output
    output.innerHTML = '';
  }

  /**
   * Render the currentSequence as clickable spans in the output div.
   */
  function renderSequence() {
    if (!currentSequence || currentSequence.length === 0) {
      output.innerHTML = '<span class="error">No suitable words found for these letters. Try different combinations.</span>';
      return;
    }
    // Build HTML for sequence
    let html = '<strong>Generated Words:</strong><br/>';
    currentSequence.forEach((word, idx) => {
      html += `<span class="word" data-index="${idx}">${word}</span>`;
      if (idx < currentSequence.length - 1) {
        html += ', ';
      }
    });
    // Compute any remaining letters
    const covered = new Set();
    currentSequence.forEach((word) => {
      for (const ch of word) covered.add(ch.toUpperCase());
    });
    const remaining = [];
    allLetters.forEach((ch) => {
      if (!covered.has(ch)) remaining.push(ch);
    });
    if (remaining.length > 0) {
      html += `<br/><span class="error">Warning: Some letters were not used: ${remaining.join(', ')}</span>`;
    }
    output.innerHTML = html;
    // Attach click listeners
    const wordElems = output.querySelectorAll('.word');
    wordElems.forEach((elem) => {
      elem.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        replaceWord(idx);
      });
    });
  }

  /**
   * Replace a word at a given index with an alternative and regenerate subsequent words.
   * @param {number} index - index of the word to replace in currentSequence
   */
  function replaceWord(index) {
    if (!currentSequence || index < 0 || index >= currentSequence.length) return;
    // Compute letters covered by earlier words and used words set
    const used = new Set();
    const coveredBefore = new Set();
    for (let i = 0; i < index; i++) {
      const w = currentSequence[i];
      used.add(w);
      for (const ch of w) {
        coveredBefore.add(ch.toUpperCase());
      }
    }
    // Determine the uncovered letters for remaining part
    const uncovered = new Set(allLetters);
    coveredBefore.forEach((ch) => uncovered.delete(ch));
    // Determine starting last letter (last char of previous word) if exists
    let startingLast = null;
    if (index > 0) {
      const prevWord = currentSequence[index - 1];
      startingLast = prevWord[prevWord.length - 1].toUpperCase();
    }
    // Record the clicked word as discarded so it is not used again
    discardedWords.add(currentSequence[index]);
    // Generate new sequence from state. banned words will include both used and discarded via generateSequenceFromState.
    used.add(currentSequence[index]);
    const newSubSequence = generateSequenceFromState(startingLast, uncovered, used);
    if (newSubSequence.length === 0) {
      // No alternative found: inform user
      alert('No alternative word could be found for "' + currentSequence[index] + '".');
      return;
    }
    // Update currentSequence by slicing up to index and concatenating new subsequence
    currentSequence = currentSequence.slice(0, index).concat(newSubSequence);
    // Render updated sequence
    renderSequence();
  }
})();