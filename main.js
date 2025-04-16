// Replace with your Supabase project details
const SUPABASE_URL = 'https://iwjchfbesvytbrkbalfd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3amNoZmJlc3Z5dGJya2JhbGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MzEyOTgsImV4cCI6MjA1OTIwNzI5OH0.wtqCiKRBuV-4nH0S_a_vjr_iFUtBnASy_Fb25t041_U';

// Initialize the Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.allowedLetters = [];
window.usedLetters = [];
window.stagingWord = '';
window.validWords = [];
window.totalScore = 0;
window.validWordsSinceTrade = 0;

// Trade variables
window.tradeMode = false;
window.letterToTrade = null;     // The letter in the current set being traded away
window.letterToTradeNew = null;  // The new letter the user selected
window.tradeLog = [];

const letterScores = {
  A: 1, B: 3, C: 3, D: 2, E: 1,
  F: 4, G: 2, H: 4, I: 1, J: 8,
  K: 5, L: 1, M: 3, N: 1, O: 1,
  P: 3, Q: 10, R: 1, S: 1, T: 1,
  U: 1, V: 4, W: 4, X: 10, Y: 4, Z: 10
};

// Utility: compute word score
function computeScore(word) {
  let sum = 0;
  for (const char of word) {
    sum += letterScores[char] || 0;
  }
  return sum * word.length;
}

function getTodayDateString() {
  const today = new Date();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${m}-${d}`;
}

// Load dictionary
async function loadDictionary() {
  try {
    const res = await fetch('dictionary.json');
    const data = await res.json();
    window.dictionary = data;
    console.log('Dictionary loaded:', data.length, 'words');
  } catch (err) {
    console.error('Error loading dictionary:', err);
  }
}

// Fetch daily letters
async function fetchDailyLetters() {
  const todayStr = getTodayDateString();
  const { data, error } = await supabase
    .from('daily_letters')
    .select('letters')
    .eq('puzzle_date', todayStr)
    .single();

  if (error) {
    console.error('Error fetching daily letters:', error);
    document.getElementById('letters-container').innerText = 'Error loading daily letters.';
    return;
  }

  if (data && data.letters) {
    const letterArray = data.letters.split(',').map(l => l.trim().toUpperCase());
    window.allowedLetters = letterArray;
    window.usedLetters = [...letterArray];
    renderLetterButtons(letterArray);
  } else {
    document.getElementById('letters-container').innerText = 'No letters found for today.';
  }
}

/* --- RENDER LETTER BUTTONS --- */
function renderLetterButtons(letterArray) {
    const container = document.getElementById('letters-container');
    container.innerHTML = '';
  
    letterArray.forEach(letter => {
      const btn = createLetterTile(letter, () => {
        if (window.tradeMode) {
          // When in trade mode, selecting a letter triggers trade selection
          selectTradeLetter(letter);
        } else {
          appendLetterToStaging(letter);
        }
      });
      // In trade mode, add green border; if this letter is the one selected, add extra styling.
      if (window.tradeMode) {
        btn.classList.add('trade-mode');
        if (letter === window.letterToTrade) {
          btn.classList.add('selected-for-trade');
        }
      }
      container.appendChild(btn);
    });
  
    // Only add backspace tile if not in trade mode
    if (!window.tradeMode) {
      const backspaceTile = document.createElement('button');
      backspaceTile.classList.add('letter-button', 'backspace-button');
      backspaceTile.innerHTML = `<span class="letter-main">&#9003;</span>`;
      backspaceTile.addEventListener('click', () => {
        if (!window.tradeMode) {
          handleBackspace();
        }
      });
      container.appendChild(backspaceTile);
    }
  }

    function handleBackspace() {
        if (window.stagingWord.length > 0) {
          window.stagingWord = window.stagingWord.slice(0, -1);
          updateStagingDisplay();
        }
      }
    
    function selectTradeLetter(letter) {
        window.letterToTrade = letter;
        // Re-render so that the selected letter gets the extra style
        renderLetterButtons(window.allowedLetters);
        // Now show the trade options popup
        showTradeOptions();
      }


/* --- CREATE A LETTER TILE WITH POINTS --- */
function createLetterTile(letter, onClick) {
  // We'll make it a button with the letter & its points
  const btn = document.createElement('button');
  btn.classList.add('letter-button');
  btn.innerHTML = `
    <span class="letter-main">${letter}</span>
    <span class="letter-points">${letterScores[letter] || 0}</span>
  `;
  btn.addEventListener('click', onClick);
  return btn;
}

/* --- STAGING WORD --- */
function appendLetterToStaging(letter) {
  window.stagingWord = (window.stagingWord || '') + letter;
  updateStagingDisplay();
  // Clear the feedback message when user starts building a new word
  document.getElementById('staging-feedback').innerText = '';
}

function updateStagingDisplay() {
  document.getElementById('staging-word').innerText = window.stagingWord || '';
}

function clearStagingWord() {
  window.stagingWord = '';
  updateStagingDisplay();
}

/* --- SUBMIT WORD --- */
function submitStagingWord() {
  if (!window.stagingWord) {
    document.getElementById('staging-feedback').innerText = 'No word to submit!';
    return;
  }
  const word = window.stagingWord.toUpperCase();
  clearStagingWord();

  if (!window.dictionary) {
    document.getElementById('staging-feedback').innerText = 'Dictionary not loaded yet.';
    return;
  }
  if (!window.dictionary.includes(word)) {
    document.getElementById('staging-feedback').innerText = `"${word}" not found!`;
    return;
  }
  if (window.validWords.some(w => w.word === word)) {
    document.getElementById('staging-feedback').innerText = `"${word}" already submitted!`;
    return;
  }

  const score = computeScore(word);
  window.validWords.push({ word, score });
  window.totalScore += score;
  window.validWordsSinceTrade++;

  //Update trade button progress color fill
  function updateTradeButtonProgress() {
    const tradeBtn = document.getElementById('trade-letter');
    // Calculate progress as a percentage (max 100%)
    const progress = Math.min(window.validWordsSinceTrade, 10) / 10 * 100;
    
    // Set the background as a left-to-right gradient:
    // The left "progress" percentage is blue (using our accent blue), and the remainder is white.
    tradeBtn.style.backgroundImage = `linear-gradient(to right, var(--accent-blue) 0%, var(--accent-blue) ${progress}%, #fff ${progress}%, #fff 100%)`;
  }

  updateTradeButtonProgress();

  // After each valid word submission
    function checkTradeEligibility() {
    const tradeBtn = document.getElementById('trade-letter');
    if (window.validWordsSinceTrade >= 10) {
      // Enable
      tradeBtn.classList.remove('disabled');
      tradeBtn.classList.add('enabled');
      tradeBtn.disabled = false;
    } else {
      // Disable
      tradeBtn.classList.remove('enabled');
      tradeBtn.classList.add('disabled');
      tradeBtn.disabled = true;
    }
  }

  //REMOVE VALID WORD FEEDBACK document.getElementById('word-feedback').innerText = `Valid: ${word} (+${score})`;
  updateSubmittedWordsDisplay();


  // Unlock trade if user hits 10 words since last trade
  if (window.validWordsSinceTrade >= 10) {
    document.getElementById('trade-letter').style.display = 'inline-block';
  }
}

/* --- DISPLAY SUBMITTED WORDS & SCORE --- */
function updateSubmittedWordsDisplay() {
    const tbody = document.getElementById('submitted-words-tbody');
    tbody.innerHTML = '';
  
    window.validWords.forEach(item => {
      const tr = document.createElement('tr');
      const tdWord = document.createElement('td');
      tdWord.textContent = item.word;
      const tdPoints = document.createElement('td');
      tdPoints.textContent = item.score;
      tr.appendChild(tdWord);
      tr.appendChild(tdPoints);
      tbody.appendChild(tr);
    });
  
    // Auto-scroll
    const container = document.getElementById('submitted-words-container');
    container.scrollTop = container.scrollHeight;
  
    // Update the total score display
    document.getElementById('total-score').textContent = window.totalScore;
  
    // Update words-submitted count
    document.getElementById('words-submitted-count').textContent = window.validWords.length;
  }

/* --- TRADE FLOW --- */
function enableTradeMode() {
    window.tradeMode = true;
    window.letterToTrade = null; // clear any previous selection
    // Update the staging feedback with instructions
    document.getElementById('staging-feedback').innerText = "Select a letter to trade.";
    // Re-render letter tiles so they show the green border (trade mode style)
    renderLetterButtons(window.allowedLetters);
  }

  // Show overlay
  document.getElementById('trade-overlay').classList.remove('hidden');

  // Clear any old content
  document.getElementById('trade-confirmation').classList.add('hidden');
  document.getElementById('trade-summary').textContent = '';
  document.getElementById('trade-options').innerHTML = '';

  // The user will click a letter in the main set to choose letterToTrade
  // Then we’ll show available letters.
  document.getElementById('trade-feedback').innerText = 'Select a letter in your set to trade away.';


function pickLetterToTrade(letter) {
  // Step 1: user picks which letter they want to remove
  window.letterToTrade = letter;

  // Step 2: show trade options in the overlay
  showTradeOptions();
  document.getElementById('trade-feedback').innerText = `Now choose a new letter to replace "${letter}".`;
}

/* Show letters A–Z except those in usedLetters. */
function showTradeOptionsPopup() {
    // Show the popup overlay
    document.getElementById('trade-overlay').classList.remove('hidden');
    // Clear previous options
    const tradeOptionsEl = document.getElementById('trade-options');
    tradeOptionsEl.innerHTML = '';
  
    const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    // Filter out letters that have been used (or that are already in the current set)
    const availableLetters = allLetters.filter(l => !window.usedLetters.includes(l));
    availableLetters.forEach(l => {
      const btn = createTradeOptionTile(l, () => {
        pickNewLetterForTrade(l);
      });
      tradeOptionsEl.appendChild(btn);
    });
}

/* Create a trade-option tile with letter & points */
function createTradeOptionTile(letter, onClick) {
  const btn = document.createElement('button');
  btn.classList.add('trade-option-button');
  btn.innerHTML = `
    <span class="letter-main">${letter}</span>
    <span class="letter-points">${letterScores[letter] || 0}</span>
  `;
  btn.addEventListener('click', onClick);
  return btn;
}

/* User picks the new letter to trade to */
function pickNewLetterForTrade(newLetter) {
  window.letterToTradeNew = newLetter;

  // Show confirmation step
  const fromPoints = letterScores[window.letterToTrade] || 0;
  const toPoints = letterScores[newLetter] || 0;
  const summary = `Trade: ${window.letterToTrade} (${fromPoints}) → ${newLetter} (${toPoints})`;
  
  document.getElementById('trade-summary').textContent = summary;
  document.getElementById('trade-confirmation').classList.remove('hidden');
}

/* Finalize the trade when user clicks "Go!" */
function confirmTrade() {
  const from = window.letterToTrade;
  const to = window.letterToTradeNew;
  if (!from || !to) return;

  // Replace in allowedLetters
  const idx = window.allowedLetters.indexOf(from);
  if (idx !== -1) {
    window.allowedLetters[idx] = to;
  }

  // Mark 'to' as used
  window.usedLetters.push(to);

  // Log the trade
  window.tradeLog.push({
    from,
    to,
    timestamp: new Date().toISOString()
  });

  // Reset counters & close trade mode
  window.validWordsSinceTrade = 0;
  updateTradeButtonProgress();
  window.tradeMode = false;
  window.letterToTrade = null;
  window.letterToTradeNew = null;

  // Hide trade button again
  document.getElementById('trade-letter').addEventListener('click', () => {
    // Enable trade mode without showing the popup immediately
    enableTradeMode();
  });

  // Update UI
  renderLetterButtons(window.allowedLetters);
  document.getElementById('trade-feedback').innerText = `Trade complete: ${from} → ${to}`;
  closeTradeOverlay();
}

/* Cancel or close the trade overlay */
function closeTradeOverlay() {
  document.getElementById('trade-overlay').classList.add('hidden');
}

/* --- EVENT LISTENERS --- */
document.getElementById('submit-word').addEventListener('click', submitStagingWord);
document.getElementById('trade-letter').addEventListener('click', enableTradeMode);

// Trade overlay buttons
document.getElementById('confirm-trade').addEventListener('click', confirmTrade);
document.getElementById('close-trade-overlay').addEventListener('click', () => {
  // If user closes overlay, we cancel trade mode
  window.tradeMode = false;
  closeTradeOverlay();
});

// Init
fetchDailyLetters();
loadDictionary();