/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";

// --- DOM Element Selection ---
const homeSection = document.getElementById('home-section') as HTMLElement;
const newsSection = document.getElementById('news-section') as HTMLElement;
const latestNewsCard = document.getElementById('latest-news-card') as HTMLElement;
const backButton = document.getElementById('back-button') as HTMLButtonElement;
const loader = document.getElementById('loader') as HTMLElement;
const newsResults = document.getElementById('news-results') as HTMLElement;

// --- Initialize the Google AI client ---
// Assumes the API key is provided via an environment variable.
let ai: GoogleGenAI;
try {
  ai = new GoogleGenAI({apiKey: process.env.API_KEY});
} catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
    // You could display an error message to the user here
    // For example, by disabling the feature card.
    latestNewsCard.style.pointerEvents = 'none';
    latestNewsCard.style.opacity = '0.5';
}


/**
 * Fetches the top 5 trending news headlines using the Gemini API with Google Search.
 */
async function fetchAndDisplayNews() {
  showLoading(true);
  newsResults.innerHTML = ''; // Clear previous results

  if (!ai) {
    newsResults.innerHTML = `<p>The AI client is not initialized. Please ensure your API key is configured correctly.</p>`;
    showLoading(false);
    return;
  }
  
  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "List the top 5 trending news headlines worldwide. Your response must be only a valid JSON array. Each object in the array must contain two keys: 'title' for the headline, and 'url' for the direct link to the article.",
        config: {
          tools: [{googleSearch: {}}],
        },
     });
    
    const textResponse = response.text;
    
    if (!textResponse) {
        throw new Error("Received an empty response from the API.");
    }

    try {
        // The model might wrap the JSON in markdown or add explanatory text.
        // We need to extract the JSON part of the string before parsing.
        const jsonStart = textResponse.indexOf('[');
        const jsonEnd = textResponse.lastIndexOf(']');

        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error("Could not find a valid JSON array in the response.");
        }

        const jsonString = textResponse.substring(jsonStart, jsonEnd + 1);
        const articles = JSON.parse(jsonString);

        if (!Array.isArray(articles) || articles.length === 0) {
            newsResults.innerHTML = '<p>No trending news could be retrieved at this time.</p>';
            return;
        }

        for (const article of articles) {
            if (article.title && article.url) {
                const newsItem = document.createElement('div');
                newsItem.className = 'news-item';
                
                const title = article.title;
                const uri = article.url;
                // Extract a readable source name from the URL
                const sourceName = new URL(uri).hostname.replace(/^www\./, '');

                newsItem.innerHTML = `
                  <a href="${uri}" target="_blank" rel="noopener noreferrer">
                    <h3>${escapeHtml(title)}</h3>
                    <p>${escapeHtml(sourceName)}</p>
                  </a>
                `;
                newsResults.appendChild(newsItem);
            }
        }
    } catch (parseError) {
        // If JSON parsing fails, the model might have returned plain text.
        // Display it as a fallback.
        console.error("Failed to parse JSON response:", parseError);
        newsResults.innerHTML = `<p>${escapeHtml(textResponse).replace(/\n/g, '<br>')}</p>`;
    }


  } catch (error) {
    console.error("Error fetching news:", error);
    newsResults.innerHTML = `<p>An error occurred while fetching news. Please check the console for details.</p>`;
  } finally {
    showLoading(false);
  }
}

/**
 * Toggles the visibility of the loading spinner.
 * @param isLoading - Whether to show or hide the loader.
 */
function showLoading(isLoading: boolean) {
  if (isLoading) {
    loader.classList.remove('hidden');
  } else {
    loader.classList.add('hidden');
  }
}

/**
 * Switches the view from the home page to the news page.
 */
function showNewsView() {
  homeSection.classList.add('hidden');
  newsSection.classList.remove('hidden');
  fetchAndDisplayNews();
}

/**
 * Switches the view from the news page back to the home page.
 */
function showHomeView() {
  newsSection.classList.add('hidden');
  homeSection.classList.remove('hidden');
}

/**
 * A simple utility to escape HTML to prevent XSS.
 * @param unsafe - The string to escape.
 * @returns The escaped string.
 */
function escapeHtml(unsafe: string): string {
  return unsafe
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
}


// --- Event Listeners ---
latestNewsCard.addEventListener('click', showNewsView);
backButton.addEventListener('click', showHomeView);

// Add keyboard accessibility for the feature card
latestNewsCard.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
        showNewsView();
    }
});