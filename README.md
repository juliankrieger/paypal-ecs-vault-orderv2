# What is this?

This is an example integration of vault payment methods and serverside orders v2 integration

The customers funding instrument is vaulted even if the customer_id is changed

# How do I run this?

0. Add your client id and secret in the `.env` file
1. Install NPM and Node
2. Change into this directory with powershell / bash and run `npm install` to install packages needed
3. In your shell, run `npm run start`
4. Open `localhost:3000` in your browser

# Which parts are important to me?

Changed from a default integration with the smart payment buttons is only the create order call, which you can find in `index.node.js`. You can look at how the client answers to these calls in `pp-buttons.mjs`

# Which parts are *not* important to me?

For easier integration, I am creating a new authorization token each api call. Don't do this. Use your auth token as long as it is viable (8 hours at time of writing). 

You also most definitely do not need the 'delete payment token button'.

# What can I do if this doesn't work?

You can contact me at jukrieger@paypal.com
