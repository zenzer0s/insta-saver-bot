const TelegramBot = require("node-telegram-bot-api");
const { log } = require('../utils');

// Create a bot instance with polling
const Bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {
  polling: {
    // Add options to handle polling conflicts
    params: {
      timeout: 30
    },
    interval: 300,
    autoStart: true
  }
});

// Add error handler for polling issues
Bot.on('polling_error', (error) => {
  // Log the error but don't crash the app
  log('Telegram polling error:', error.message);
  
  // If it's a conflict error, try to restart polling after a delay
  if (error.message.includes('terminated by other getUpdates request')) {
    log('Detected polling conflict, attempting to restart polling...');
    
    // Stop polling
    Bot.stopPolling().then(() => {
      // Wait 5 seconds before restarting
      setTimeout(() => {
        Bot.startPolling();
        log('Polling restarted');
      }, 5000);
    });
  }
});

module.exports = Bot;
