// Replace with your Supabase project details
const SUPABASE_URL = 'https://iwjchfbesvytbrkbalfd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3amNoZmJlc3Z5dGJya2JhbGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MzEyOTgsImV4cCI6MjA1OTIwNzI5OH0.wtqCiKRBuV-4nH0S_a_vjr_iFUtBnASy_Fb25t041_U';

// Initialize the Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
  // Query the daily_letters table for today’s date
  const { data, error } = await supabase
    .from('daily_letters')
    .select('letters')
    .eq('date', todayStr)
    .single();  // Expect a single row per day
  
  if (error) {
    console.error('Error fetching daily letters:', error);
    document.getElementById('daily-letters').innerText = 'Error loading daily letters.';
    return;
  }
  
  // If data is found, split the letters and display them
  if (data && data.letters) {
    const letterArray = data.letters.split(',');
    document.getElementById('daily-letters').innerText = 'Today\'s Letters: ' + letterArray.join(' ');
  } else {
    document.getElementById('daily-letters').innerText = 'No letters found for today.';
  }
}

// Fetch the daily letters when the page loads
fetchDailyLetters();