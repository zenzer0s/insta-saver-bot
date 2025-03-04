require("dotenv").config();
const express = require("express");
const app = express();
const { Bot, Browser } = require("./config");
const { initQueue, requestQueue } = require("./queue");
const { log } = require("./utils");
const { sendMessage } = require("./telegramActions");
const { isValidInstaUrl } = require("./utils/helper");
const { addOrUpdateUser } = require("./utils/addOrUpdateUser");
const { REQUEST_STATUS } = require("./constants");
const ContentRequest = require("./models/ContentRequest"); // Import ContentRequest
const { MESSAGE } = require("./constants"); // Import MESSAGE

// Set the server to listen on port 6060
const PORT = process.env.PORT || 6060;

// Listen for any kind of message. There are different kinds of messages.
Bot.onText(/^\/start/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userName = msg?.from?.username || "";
    const firstName = msg.from.first_name;
    let welcomeMessage = MESSAGE.WELCOME.replace(
        "firstName",
        msg.from.first_name
    );

    // Send a welcome message to the chat
    await sendMessage({
        chatId,
        requestedBy: { userName, firstName },
        message: welcomeMessage,
    });
});

Bot.onText(/^https:\/\/www\.instagram\.com(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userMessage = msg.text;
    const userName = msg?.from?.username || "";
    const firstName = msg?.from?.first_name || "";
    let isURL =
        msg.entities &&
        msg.entities.length > 0 &&
        msg.entities[0].type === "url";
    // Process user message
    if (isURL) {
        let requestUrl = userMessage;
        let urlResponse = isValidInstaUrl(requestUrl);
        log("urlResponse: ", urlResponse);
        if (!urlResponse.success || !urlResponse.shortCode) {
            // If domain cleaner fails, exit early
            log("return from here as shortCode not found");
            return;
        }
        
        try {
            // Save the request to the JSON database
            const newRequest = {
                id: Date.now().toString(),
                chatId,
                requestUrl,
                shortCode: urlResponse.shortCode,
                requestedBy_userName: userName,
                requestedBy_firstName: firstName,
                messageId: messageId,
                requestedAt: new Date(),
                updatedAt: new Date(),
                status: REQUEST_STATUS.PENDING,
                retryCount: 0
            };

            await ContentRequest.create(newRequest);

            // Add the job to the queue directly
            requestQueue.add({
                id: newRequest.id.toString(),
                messageId,
                shortCode: urlResponse.shortCode,
                requestUrl,
                requestedBy: {
                    userName,
                    firstName
                },
                retryCount: 0,
                chatId
            });

            await addOrUpdateUser(chatId, userName, firstName);
        } catch (error) {
            log("Error saving content request:", error);
        }
    }
});

// Express routes
app.get("/", (req, res) => {
    res.json({ message: "Welcome to Insta Saver Bot" });
});

app.get("/test", (req, res) => {
    res.json({ message: "Bot is Online!!" });
});

// Check if the module is being run directly
if (require.main === module) {
    let server;
    
    // Handle shutdown gracefully
    const gracefulShutdown = async () => {
        log("Shutting down gracefully...");
        // Stop the bot polling first to prevent new requests
        if (Bot.isPolling()) {
            log("Stopping bot polling...");
            await Bot.stopPolling();
        }
        
        // Close Browser
        await Browser.Close();
        
        // Close the server if it exists
        if (server) {
            log("Closing HTTP server...");
            server.close();
        }
        
        log("Shutdown complete");
        process.exit(0);
    };

    // Process termination signals
    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);
    
    // Start the server
    server = app.listen(PORT, async () => {
        log(`Insta saver running at http://localhost:${PORT}`);

        try {
            // Open Browser
            await Browser.Open();

            // Initialize the job queue
            await initQueue();
            
            log("Bot is ready to receive messages!");
        } catch (error) {
            log("Error during startup:", error);
            // Exit with error code if startup fails
            process.exit(1);
        }
    });
} else {
    // Export the app instance for importing
    module.exports = app;
}
