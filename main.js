// Replace with your Supabase project details
const SUPABASE_URL = 'https://iwjchfbesvytbrkbalfd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3amNoZmJlc3Z5dGJya2JhbGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MzEyOTgsImV4cCI6MjA1OTIwNzI5OH0.wtqCiKRBuV-4nH0S_a_vjr_iFUtBnASy_Fb25t041_U';

// Initialize the Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Global variables for allowed letters, staging word, valid words, total score, and trade tracking
window.allowedLetters = [];           // current letter set
window.usedLetters = [];              // all letters that have ever been in the set (initial + traded in)
window.stagingWord = '';
window.validWords = [];               // array of objects: { word, score }
window.totalScore = 0;
window.validWordsSinceTrade = 0;      // counter since last trade
window.tradeMode = false;             // flag for trade mode
window.tradeLog = [];                 // array of trade objects: { from, to, timestamp }
window.letterToTrade = null;          // the letter user has selected to trade

// Define the point values for each letter (range 1-10)
const letterScores = {
  A: 1, B: 3, C: 3, D: 2, E: 1,
  F: 4, G: 2, H: 4, I: 1, J: 8,
  K: 5, L: 1, M: 3, N: 1, O: 1,
  P: 3, Q: 10, R: 1, S: 1, T: 1,
  U: 1, V: 4, W: 4, X: 10, Y: 4, Z: 10
};

// Function to compute score for a word
function computeScore(word) {
  let sum = 0;
  for (const char of word) {
    sum += letterScores[char] || 0;
  }
  return sum * word.length;
}

// Utility: Get today's date in YYYY-MM-DD format
function getTodayDateString() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

// Load the dictionary from dictionary.json
async function loadDictionary() {
  try {
    const response = await fetch('dictionary.json');
    const data = await response.json();
    window.dictionary = data;
    console.log('Dictionary loaded:', window.dictionary.length, "words");
  } catch (err) {
    console.error('Error loading dictionary:', err);
  }
}

// Fetch daily letters from Supabase and render them as clickable buttons
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
    // Process letters: split, trim, uppercase
    const letterArray = data.letters.split(',').map(letter => letter.trim().toUpperCase());
    window.allowedLetters = letterArray;
    // Initially, mark all starting letters as used
    window.usedLetters = [...letterArray];
    renderLetterButtons(letterArray);
  } else {
    document.getElementById('letters-container').innerText = 'No letters found for today.';
  }
}

// Render clickable letter buttons.
// If tradeMode is active, clicking a letter initiates a trade.
function renderLetterButtons(letterArray) {
  const container = document.getElementById('letters-container');
  container.innerHTML = ''; // Clear existing content
  letterArray.forEach(letter => {
    const btn = document.createElement('button');
    btn.classList.add('letter-button');
    btn.innerText = letter;
    btn.addEventListener('click', () => {
      if (window.tradeMode) {
        // In trade mode, clicking a letter initiates a trade for that letter
        initiateTrade(letter);
      } else {
        // Normal mode: append letter to staging word
        appendLetterToStaging(letter);
      }
    });
    container.appendChild(btn);
  });
}

// Update staging word display
function updateStagingDisplay() {
  const stagingDisplay = document.getElementById('staging-word');
  stagingDisplay.innerText = window.stagingWord || '';
}

// Append a letter to the staging word
function appendLetterToStaging(letter) {
  window.stagingWord = (window.stagingWord || '') + letter;
  updateStagingDisplay();
}

// Clear the staging word
function clearStagingWord() {
  window.stagingWord = '';
  updateStagingDisplay();
}

// Update the display of submitted words and total score
function updateSubmittedWordsDisplay() {
  const listContainer = document.getElementById('submitted-words-list');
  listContainer.innerHTML = ''; // Clear current list
  window.validWords.forEach(item => {
    const li = document.createElement('li');
    li.innerText = `${item.word} (Score: ${item.score})`;
    listContainer.appendChild(li);
  });
  document.getElementById('total-score').innerText = `Total Score: ${window.totalScore}`;
}

// Handle submission of the staged word: validate, score, update counters.
function submitStagingWord() {
  if (!window.stagingWord || window.stagingWord.length === 0) {
    document.getElementById('word-feedback').innerText = 'No word to submit!';
    return;
  }
  
  const word = window.stagingWord.toUpperCase();
  clearStagingWord();
  
  if (!window.dictionary) {
    document.getElementById('word-feedback').innerText = 'Dictionary not loaded yet. Please try again later.';
    return;
  }
  
  if (!window.dictionary.includes(word)) {
    document.getElementById('word-feedback').innerText = `Word "${word}" not found in dictionary!`;
    return;
  }
  
  if (window.validWords.some(item => item.word === word)) {
    document.getElementById('word-feedback').innerText = `Word "${word}" has already been submitted!`;
    return;
  }
  
  const score = computeScore(word);
  window.validWords.push({ word, score });
  window.totalScore += score;
  window.validWordsSinceTrade++;  // Increment counter for trade unlocking
  
  console.log('Submitted word:', word, 'Score:', score);
  document.getElementById('word-feedback').innerText = `Valid submission: ${word} (Score: ${score})`;
  updateSubmittedWordsDisplay();
  
  // Check if 10 words have been submitted since last trade; if so, show the trade button.
  if (window.validWordsSinceTrade >= 10) {
    document.getElementById('trade-letter').style.display = 'inline-block';
  }
}

// ========================
// TRADING FUNCTIONS
// ========================

// Called when in trade mode and the user clicks a letter in their allowed set.
// This records the letter to be traded away and displays available trade options.
function initiateTrade(letter) {
  window.letterToTrade = letter;
  document.getElementById('trade-feedback').innerText = `Trading letter: ${letter}. Select a new letter:`;
  displayTradeOptions();
}

// Displays available letters (A-Z minus those in window.usedLetters) as clickable buttons.
function displayTradeOptions() {
  const tradeOptionsContainer = document.getElementById('trade-options');
  tradeOptionsContainer.innerHTML = '';  // Clear previous options
  
  // Get available letters: all letters A-Z that are NOT in usedLetters.
  const allLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
  const availableLetters = allLetters.filter(l => !window.usedLetters.includes(l));
  
  availableLetters.forEach(letter => {
    const btn = document.createElement('button');
    btn.classList.add('trade-option-button');
    btn.innerText = letter;
    btn.addEventListener('click', () => {
      executeTrade(letter);
    });
    tradeOptionsContainer.appendChild(btn);
  });
}

// Executes the trade: replaces window.letterToTrade in allowedLetters with the new letter,
// updates usedLetters and logs the trade, then resets trade mode.
function executeTrade(newLetter) {
  // Replace the traded letter in allowedLetters
  const index = window.allowedLetters.indexOf(window.letterToTrade);
  if (index !== -1) {
    window.allowedLetters[index] = newLetter;
  }
  
  // Add the new letter to usedLetters
  window.usedLetters.push(newLetter);
  
  // Log the trade
  window.tradeLog.push({
    from: window.letterToTrade,
    to: newLetter,
    timestamp: new Date().toISOString()
  });
  
  // Exit trade mode and reset trade-related counters
  window.tradeMode = false;
  window.validWordsSinceTrade = 0;
  window.letterToTrade = null;
  
  // Hide trade options and trade button, and update UI
  document.getElementById('trade-options').innerHTML = '';
  document.getElementById('trade-feedback').innerText = `Trade complete: swapped letter.`;
  document.getElementById('trade-letter').style.display = 'none';
  
  // Re-render the allowed letters UI
  renderLetterButtons(window.allowedLetters);
}

// Event listener for the "Trade Letter" button. Activates trade mode.
document.getElementById('trade-letter').addEventListener('click', () => {
  window.tradeMode = true;
  document.getElementById('trade-feedback').innerText = 'Trade mode activated: Click a letter in your set to trade away.';
});

// ========================
// Set up event listeners for normal controls
document.getElementById('clear-word').addEventListener('click', clearStagingWord);
document.getElementById('submit-word').addEventListener('click', submitStagingWord);

// ========================
// Initialization: fetch letters and load dictionary
fetchDailyLetters();
loadDictionary();