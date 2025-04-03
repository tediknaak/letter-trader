// Replace with your Supabase project details
const SUPABASE_URL = 'https://iwjchfbesvytbrkbalfd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3amNoZmJlc3Z5dGJya2JhbGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MzEyOTgsImV4cCI6MjA1OTIwNzI5OH0.wtqCiKRBuV-4nH0S_a_vjr_iFUtBnASy_Fb25t041_U';

// Initialize the Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Utility function to format today’s date in YYYY-MM-DD
function getTodayDateString() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

// Function to fetch today's letters from Supabase
async function fetchDailyLetters() {
  const todayStr = getTodayDateString();
    console.log('Today string is:', todayStr);
  // Query the daily_letters table for today’s date
  const { data, error } = await supabase
    .from('daily_letters')
    .select('letters')
    .eq('puzzle_date', todayStr)
    .single();  // Expect a single row per day
  
  if (error) {
    console.error('Error fetching daily letters:', error);
    document.getElementById('daily-letters').innerText = 'Error loading daily letters.';
    return;
  }
  
  // If data is found, split the letters and display them
  if (data && data.letters) {
    // Split the letters, convert to uppercase, and store them globally
    const letterArray = data.letters.split(',').map(letter => letter.trim().toUpperCase());
    window.allowedLetters = letterArray;
    document.getElementById('daily-letters').innerText = 'Today\'s Letters: ' + window.allowedLetters.join(' ');
  } else {
    document.getElementById('daily-letters').innerText = 'No letters found for today.';
  }
}

// Fetch the daily letters when the page loads
fetchDailyLetters();

// Helper function: Check if the word uses only allowed letters
function isWordUsingAllowedLetters(word, allowedLetters) {
    // Convert the word to uppercase for a case-insensitive comparison
    word = word.toUpperCase();
    // Check that every letter in the word is in the allowedLetters array
    return [...word].every(letter => allowedLetters.includes(letter));
  }

// -----------------------
// Word Submission UI Logic
// -----------------------

// Get references to the form and input elements
const wordForm = document.getElementById('word-form');
const wordInput = document.getElementById('word-input');
const wordFeedback = document.getElementById('word-feedback');

// Listen for form submission
wordForm.addEventListener('submit', function (e) {
  e.preventDefault(); // Prevent the form from reloading the page
  
  // Get the word value and trim any extra whitespace
  const submittedWord = wordInput.value.trim();

   // Ensure the allowed letters have been loaded
   if (!window.allowedLetters) {
    wordFeedback.innerText = "Allowed letters not loaded yet. Please try again later.";
    return;
  }
  
  // Validate that the submitted word contains only allowed letters
  if (!isWordUsingAllowedLetters(submittedWord, window.allowedLetters)) {
    wordFeedback.innerText = "Invalid word: Please use only the allowed letters: " + window.allowedLetters.join(' ');
    return;
  }
  
  // If we pass the validation, log the word and update feedback
  console.log('Submitted word:', submittedWord);
  wordFeedback.innerText = `Valid submission: ${submittedWord}`;
  
  // Clear the input for the next word
  wordInput.value = '';
});