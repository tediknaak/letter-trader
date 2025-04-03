// Replace with your Supabase project details
const SUPABASE_URL = 'https://iwjchfbesvytbrkbalfd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3amNoZmJlc3Z5dGJya2JhbGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MzEyOTgsImV4cCI6MjA1OTIwNzI5OH0.wtqCiKRBuV-4nH0S_a_vjr_iFUtBnASy_Fb25t041_U';

// Initialize the Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Global variables for allowed letters, staging word, valid words, and total score
window.allowedLetters = [];
window.stagingWord = '';
window.validWords = [];
window.totalScore = 0;

// Define the point values for each letter (range 1-10)
const letterScores = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 10,
  Y: 4,
  Z: 10
};

// Function to compute the score for a word
function computeScore(word) {
  let sum = 0;
  for (const char of word) {
    sum += letterScores[char] || 0;
  }
  return sum * word.length;
}

// Utility to get today's date in YYYY-MM-DD format
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
    // Assuming words in dictionary.json are already in uppercase
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
    // Split, trim, and convert letters to uppercase
    const letterArray = data.letters.split(',').map(letter => letter.trim().toUpperCase());
    window.allowedLetters = letterArray;
    renderLetterButtons(letterArray);
  } else {
    document.getElementById('letters-container').innerText = 'No letters found for today.';
  }
}

// Render each allowed letter as a clickable button
function renderLetterButtons(letterArray) {
  const container = document.getElementById('letters-container');
  container.innerHTML = ''; // Clear any existing content
  letterArray.forEach(letter => {
    const btn = document.createElement('button');
    btn.classList.add('letter-button');
    btn.innerText = letter;
    // When clicked, add the letter to the staging word
    btn.addEventListener('click', () => {
      appendLetterToStaging(letter);
    });
    container.appendChild(btn);
  });
}

// Update the staging word display area
function updateStagingDisplay() {
  const stagingDisplay = document.getElementById('staging-word');
  stagingDisplay.innerText = window.stagingWord || '';
}

// Append a letter to the staging word (allowing duplicates)
function appendLetterToStaging(letter) {
  if (!window.stagingWord) {
    window.stagingWord = '';
  }
  window.stagingWord += letter;
  updateStagingDisplay();
}

// Clear the staging word area
function clearStagingWord() {
  window.stagingWord = '';
  updateStagingDisplay();
}

// Update the submitted words display area with word and score, and show total score
function updateSubmittedWordsDisplay() {
  const listContainer = document.getElementById('submitted-words-list');
  listContainer.innerHTML = ''; // Clear current list
  window.validWords.forEach(item => {
    const li = document.createElement('li');
    li.innerText = `${item.word} (Score: ${item.score})`;
    listContainer.appendChild(li);
  });
  // Update total score display
  document.getElementById('total-score').innerText = `Total Score: ${window.totalScore}`;
}

// Handle submission of the staged word with dictionary validation and scoring
function submitStagingWord() {
  if (!window.stagingWord || window.stagingWord.length === 0) {
    document.getElementById('word-feedback').innerText = 'No word to submit!';
    return;
  }
  
  // Capture the staged word and convert it to uppercase
  const word = window.stagingWord.toUpperCase();
  
  // Immediately clear the staging area
  clearStagingWord();
  
  // Ensure the dictionary is loaded
  if (!window.dictionary) {
    document.getElementById('word-feedback').innerText = 'Dictionary not loaded yet. Please try again later.';
    return;
  }
  
  // Validate the word against the dictionary
  if (!window.dictionary.includes(word)) {
    document.getElementById('word-feedback').innerText = `Word "${word}" not found in dictionary!`;
    return;
  }
  
  // Check for duplicate submission
  if (window.validWords.some(item => item.word === word)) {
    document.getElementById('word-feedback').innerText = `Word "${word}" has already been submitted!`;
    return;
  }
  
  // Compute the score for the word
  const score = computeScore(word);
  
  // Add the word and its score to the list of valid words
  window.validWords.push({ word, score });
  
  // Update the running total score
  window.totalScore += score;
  
  // Log the submission and update the feedback
  console.log('Submitted word:', word, 'Score:', score);
  document.getElementById('word-feedback').innerText = `Valid submission: ${word} (Score: ${score})`;
  
  // Refresh the display of submitted words and total score
  updateSubmittedWordsDisplay();
}

// Set up event listeners for control buttons
document.getElementById('clear-word').addEventListener('click', clearStagingWord);
document.getElementById('submit-word').addEventListener('click', submitStagingWord);

// When the page loads, fetch daily letters and load the dictionary
fetchDailyLetters();
loadDictionary();