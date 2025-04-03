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
      // Split the letters, convert them to uppercase, and store globally
      const letterArray = data.letters.split(',').map(letter => letter.trim().toUpperCase());
      window.allowedLetters = letterArray;
      // Render letter buttons in the UI
      renderLetterButtons(letterArray);
    } else {
      document.getElementById('letters-container').innerText = 'No letters found for today.';
    }
  }
  
  function renderLetterButtons(letterArray) {
    const container = document.getElementById('letters-container');
    container.innerHTML = ''; // Clear existing content
    letterArray.forEach(letter => {
      const btn = document.createElement('button');
      btn.classList.add('letter-button');
      btn.innerText = letter;
      // On click, append the letter to the staging word
      btn.addEventListener('click', () => {
        appendLetterToStaging(letter);
      });
      container.appendChild(btn);
    });
  }
  
  // Update the staging word display
  function updateStagingDisplay() {
    const stagingDisplay = document.getElementById('staging-word');
    stagingDisplay.innerText = window.stagingWord || '';
  }
  
  // Append a letter to the staging word (allow duplicates)
  function appendLetterToStaging(letter) {
    if (!window.stagingWord) {
      window.stagingWord = '';
    }
    window.stagingWord += letter;
    updateStagingDisplay();
  }
  
  // Clear the staging word
  function clearStagingWord() {
    window.stagingWord = '';
    updateStagingDisplay();
  }
  
  // Handle word submission
  function submitStagingWord() {
    if (!window.stagingWord || window.stagingWord.length === 0) {
      document.getElementById('word-feedback').innerText = 'No word to submit!';
      return;
    }
    console.log('Submitted word:', window.stagingWord);
    document.getElementById('word-feedback').innerText = `You submitted: ${window.stagingWord}`;
    // After submission, clear the staging word
    clearStagingWord();
  }
  
  // Set up event listeners for the control buttons
  document.getElementById('clear-word').addEventListener('click', clearStagingWord);
  document.getElementById('submit-word').addEventListener('click', submitStagingWord);
  
  // Fetch the daily letters when the page loads
  fetchDailyLetters();