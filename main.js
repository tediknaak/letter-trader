// Replace with your Supabase project details
const SUPABASE_URL = 'https://iwjchfbesvytbrkbalfd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3amNoZmJlc3Z5dGJya2JhbGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MzEyOTgsImV4cCI6MjA1OTIwNzI5OH0.wtqCiKRBuV-4nH0S_a_vjr_iFUtBnASy_Fb25t041_U';

// Initialize the Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Global variables for allowed letters, staging word, and valid words
window.allowedLetters = [];
window.stagingWord = '';
window.validWords = [];

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
    console.log('Dictionary loaded:', window.dictionary);
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

// Update the submitted words display area
function updateSubmittedWordsDisplay() {
  const listContainer = document.getElementById('submitted-words-list');
  listContainer.innerHTML = ''; // Clear current list
  window.validWords.forEach(word => {
    const li = document.createElement('li');
    li.innerText = word;
    listContainer.appendChild(li);
  });
}

// Handle submission of the staged word with dictionary validation
function submitStagingWord() {
  if (!window.stagingWord || window.stagingWord.length === 0) {
    document.getElementById('word-feedback').innerText = 'No word to submit!';
    return;
  }
  
  // Capture the staged word and convert it to uppercase
  const word = window.stagingWord.toUpperCase();
  
  // Immediately clear the staging word area
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
  
  // If the word is valid, add it to the list of valid words
  window.validWords.push(word);
  
  // Log the submission and update the feedback
  console.log('Submitted word:', word);
  document.getElementById('word-feedback').innerText = `Valid submission: ${word}`;
  
  // Refresh the display of submitted words
  updateSubmittedWordsDisplay();
}

// Set up event listeners for control buttons
document.getElementById('clear-word').addEventListener('click', clearStagingWord);
document.getElementById('submit-word').addEventListener('click', submitStagingWord);

// When the page loads, fetch daily letters and load the dictionary
fetchDailyLetters();
loadDictionary();