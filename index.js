import { init } from './rating-graph.js';

document.addEventListener('DOMContentLoaded', () => {
    const button = document.querySelector('button');
  
    button.addEventListener('click', async () => {
      // 1) Read the usernames from the input fields
      const user1 = document.getElementById('user1').value;
      const user2 = document.getElementById('user2').value;
  
      // 2) Call the Node endpoint to get the rating data
      const resp = await fetch(`/rating-data?user1=${user1}&user2=${user2}`);
      const { rating_history1, rating_history2 } = await resp.json();
      console.log(rating_history1);
      console.log(rating_history2);
      
      init(rating_history1, rating_history2);
    });
});