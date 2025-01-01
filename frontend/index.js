import { init } from './rating-graph.js';

document.addEventListener('DOMContentLoaded', () => {
    const button = document.querySelector('button');
    const loadingOverlay = document.getElementById('loading-overlay');

    button.addEventListener('click', async () => {
        try {
            loadingOverlay.style.display = 'flex';
            button.disabled = true; // Optional: Disable the button

            // 1) Read the usernames from the input fields
            const user1 = document.getElementById('user1').value.trim();
            const user2 = document.getElementById('user2').value.trim();

            // Basic input validation
            if (!user1 || !user2) {
                alert('Please enter both usernames.');
                return;
            }

            // 2) Call the Node endpoint to get the rating data
            const response = await fetch(`/rating-data?user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}`);

            if (!response.ok) {
                throw new Error(`Error fetching data: ${response.statusText}`);
            }

            const { rating_history1, rating_history2 } = await response.json();

            console.log(rating_history1);
            console.log(rating_history2);
            
            // 3) Initialize the rating graph
            await init(rating_history1, rating_history2);
        } catch (error) {
            console.error(error);
            alert('An error occurred while fetching the rating data. Please try again.');
        } finally {
            // Hide the loading overlay and enable the button
            loadingOverlay.style.display = 'none';
            button.disabled = false;
        }
    });
});
