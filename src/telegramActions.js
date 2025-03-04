const { Bot } = require("./config");
const {
    ACTION,
    ERROR_TYPE,
    LOG_TYPE,
    MESSSAGE,
    MEDIA_TYPE,
} = require("./constants");
const { log, logMessage, logError } = require("./utils");

// Format caption to proper length and format
const formatCaption = (caption, ownerName) => {
  if (!caption) return '';
  
  // Telegram has a limit of 1024 characters for captions
  const maxLength = 1000; 
  
  // Add credit line
  const creditLine = ownerName ? `\n\nCredit: @${ownerName}` : '';
  
  // Format caption
  let formattedCaption = caption.trim();
  
  // If caption is too long, trim it and add ellipsis
  if (formattedCaption.length + creditLine.length > maxLength) {
    formattedCaption = formattedCaption.substring(0, maxLength - creditLine.length - 3) + '...';
  }
  
  return formattedCaption + creditLine;
};

// Send typing action to indicate user activity
const sendChatAction = async (context) => {
    const { chatId, messageId, requestedBy, requestUrl, message } = context;
    try {
        await Bot.sendChatAction(chatId, "typing");
    } catch (error) {
        let errorObj = {
            action: ACTION.SEND_CHAT_ACTION,
            errorCode: error?.response?.body?.error_code,
            errorDescription: error?.response?.body?.description,
            requestedBy,
            chatId,
            requestUrl,
        };
        // Handle rate limit errors separately
        if (error?.response?.body?.error_code === 429) {
            logError({ ...errorObj, type: ERROR_TYPE.RATE_LIMIT });
        } else {
            logError({ ...errorObj, type: ERROR_TYPE.FAILED });
        }
    }
};

// Delete specified messages from chat
const deleteMessages = async (context) => {
    const { chatId, messagesToDelete, requestedBy, requestUrl } = context;
    messagesToDelete.forEach(async (messageId) => {
        try {
            await Bot.deleteMessage(chatId, messageId);
        } catch (error) {
            let errorObj = {
                action: ACTION.DELETE_MESSAGE,
                errorCode: error?.response?.body?.error_code,
                errorDescription: error?.response?.body?.description,
                requestedBy,
                chatId,
                requestUrl,
            };
            // Handle rate limit errors separately
            if (error?.response?.body?.error_code === 429) {
                logError({ ...errorObj, type: ERROR_TYPE.RATE_LIMIT });
            } else {
                logError({ ...errorObj, type: ERROR_TYPE.FAILED });
            }
        }
    });
};

/**
 * Send a simple text message to a chat
 * @param {Object} params - Message parameters
 * @param {String} params.chatId - The ID of the chat to send the message to
 * @param {Object} params.requestedBy - Information about the requester
 * @param {String} params.message - The message to send
 */
const sendMessage = async ({ chatId, requestedBy, message }) => {
    try {
        const { userName, firstName } = requestedBy;
        log(`Sending message to ${firstName || userName || chatId}`);
        await Bot.sendMessage(chatId, message, { parse_mode: "HTML" });
    } catch (error) {
        log("Error sending message:", error);
    }
};

// Send a media group (array of media) to a chat
const sendMediaGroup = async (context) => {
    const {
        chatId,
        messageId,
        requestedBy,
        requestUrl,
        mediaGroupUrls,
        caption,
    } = context;
    try {
        await Bot.sendMediaGroup(chatId, mediaGroupUrls, {
            reply_to_message_id: messageId,
            // has_spoiler: true,
            caption: caption,
        });
        // Log successful group message sending
        logMessage({
            type: LOG_TYPE.GROUP,
            requestedBy,
            chatId,
            requestUrl,
        });
    } catch (error) {
        let errorObj = {
            action: ACTION.SEND_MEDIA_GROUP,
            errorCode: error?.response?.body?.error_code,
            errorDescription: error?.response?.body?.description,
            requestedBy,
            chatId,
            requestUrl,
        };
        // Handle rate limit errors separately
        if (error?.response?.body?.error_code === 429) {
            logError({ ...errorObj, type: ERROR_TYPE.RATE_LIMIT });
            await Bot.sendMessage(chatId, MESSSAGE.COOL_DOWN);
        } else {
            logError({ ...errorObj, type: ERROR_TYPE.FAILED });
        }
    }
};

// Send a video to a chat
const sendVideo = async (context) => {
    const { chatId, messageId, requestedBy, requestUrl, mediaUrl, caption } =
        context;
    try {
        await Bot.sendVideo(chatId, mediaUrl, {
            reply_to_message_id: messageId,
            // has_spoiler: true,
            caption: caption,
        });
        // Log successful video sending
        logMessage({
            type: LOG_TYPE.VIDEO,
            requestedBy,
            chatId,
            requestUrl,
        });
    } catch (error) {
        let errorObj = {
            action: ACTION.SEND_VIDEO,
            errorCode: error?.response?.body?.error_code,
            errorDescription: error?.response?.body?.description,
            requestedBy,
            chatId,
            requestUrl,
        };
        // Handle different error scenarios
        if (error?.response?.body?.error_code === 429) {
            logError({ ...errorObj, type: ERROR_TYPE.RATE_LIMIT });
            await Bot.sendMessage(chatId, MESSSAGE.COOL_DOWN);
        } else if (error?.response?.body?.error_code === 400) {
            log("error?.response?.body ", error?.response?.body);
            // Handle specific error for video upload limits
            await sendMessage({
                ...context,
                message: MESSSAGE.VIDEO_UPLOAD_LIMIT.replace(
                    "mediaUrl",
                    mediaUrl
                ),
            });
            logMessage({
                type: LOG_TYPE.VIDEO_URL,
                requestedBy,
                chatId,
                requestUrl,
            });
        } else {
            logError({ ...errorObj, type: ERROR_TYPE.FAILED });
        }
    }
};

// Send a photo to a chat
const sendPhoto = async (context) => {
    const { chatId, messageId, requestedBy, requestUrl, mediaUrl, caption } =
        context;
    try {
        await Bot.sendPhoto(chatId, mediaUrl, {
            reply_to_message_id: messageId,
            // has_spoiler: true,
            caption: caption,
        });
        // Log successful photo sending
        logMessage({
            type: LOG_TYPE.PHOTO,
            requestedBy,
            chatId,
            requestUrl,
        });
    } catch (error) {
        let errorObj = {
            action: ACTION.SEND_PHOTO,
            errorCode: error?.response?.body?.error_code,
            errorDescription: error?.response?.body?.description,
            requestedBy,
            chatId,
            requestUrl,
        };
        // Handle different error scenarios
        if (error?.response?.body?.error_code === 429) {
            logError({ ...errorObj, type: ERROR_TYPE.RATE_LIMIT });
            await Bot.sendMessage(chatId, MESSSAGE.COOL_DOWN);
        } else if (error?.response?.body?.error_code === 400) {
            // Handle specific error for photo upload limits
            await sendMessage({
                ...context,
                message: MESSSAGE.VIDEO_UPLOAD_LIMIT.replace(
                    "mediaUrl",
                    mediaUrl
                ),
            });
            logMessage({
                type: LOG_TYPE.PHOTO_URL,
                requestedBy,
                chatId,
                requestUrl,
            });
        } else {
            logError({ ...errorObj, type: ERROR_TYPE.FAILED });
        }
    }
};

// Send requested data (media or messages) to a chat
const sendRequestedData = async (data) => {
    const {
        chatId,
        messageId,
        requestedBy,
        requestUrl,
        captionText,
        mediaUrl,
        mediaType,
        mediaBuffer, // Add this field to handle media buffers
        mediaList,
        owner_userName
    } = data;

    log(`Sending requested data to chat ${chatId}:`);
    log(`- Media type: ${mediaType}`);
    log(`- Media URL: ${mediaUrl ? mediaUrl.substring(0, 50) + "..." : "None"}`);
    
    // Format the caption properly
    const caption = formatCaption(captionText, owner_userName);

    const messagesToDelete = [];

    const userContext = {
        chatId,
        messageId,
        requestedBy,
        requestUrl,
        caption, // Use the formatted caption
        mediaUrl
    };

    // Send typing action if chatId is present
    if (chatId) {
        await sendChatAction({
            chatId,
            messageId,
            requestedBy,
            requestUrl,
            action: "typing",
        });
    }

    // Check if we have a valid media URL or buffer
    if (!mediaUrl && !mediaBuffer) {
        log("No valid media URL or buffer to send");
        await sendMessage({
            chatId,
            requestedBy,
            message: "Sorry, I couldn't extract media from this post."
        });
        return;
    }

    // Continue with existing code for sending media
    try {
        if (mediaType === MEDIA_TYPE.VIDEO) {
            if (mediaBuffer) {
                await Bot.sendVideo(chatId, mediaBuffer, { caption });
                log("Video buffer sent successfully");
            } else {
                await sendVideo(userContext);
                log("Video sent successfully");
            }
        } else if (mediaType === MEDIA_TYPE.IMAGE) {
            await sendPhoto(userContext);
            log("Photo sent successfully");
        } else if (mediaType === MEDIA_TYPE.CAROUSEL_ALBUM) {
            // Handle carousel items
            if (mediaList && mediaList.length > 0) {
                const mediaGroupUrls = [];
                
                // Process carousel items
                for (let i = 0; i < Math.min(mediaList.length, 10); i++) {
                    const item = mediaList[i];
                    if (item.url) {
                        // Determine media type from URL
                        if (item.url.includes('.mp4')) {
                            mediaGroupUrls.push({
                                type: 'video',
                                media: item.url,
                                caption: i === 0 ? caption : ''
                            });
                        } else {
                            mediaGroupUrls.push({
                                type: 'photo',
                                media: item.url,
                                caption: i === 0 ? caption : ''
                            });
                        }
                    }
                }

                if (mediaGroupUrls.length > 0) {
                    await sendMediaGroup({
                        ...userContext,
                        mediaGroupUrls,
                        caption
                    });
                    log(`Media group with ${mediaGroupUrls.length} items sent successfully`);
                } else {
                    log("No valid media URLs in carousel");
                    await sendMessage({
                        chatId,
                        requestedBy,
                        message: "Sorry, I couldn't extract media from this carousel post."
                    });
                }
            } else {
                log("No media list found for carousel");
                await sendMessage({
                    chatId,
                    requestedBy,
                    message: "Sorry, I couldn't extract media items from this carousel post."
                });
            }
        }
    } catch (error) {
        log("Error sending media to telegram:", error.message);
        await sendMessage({
            chatId,
            requestedBy,
            message: "Sorry, I had trouble sending the media. Instagram might be restricting access."
        });
    }

    // Clean up messages
    if (messagesToDelete.length > 0) {
        await deleteMessages({
            chatId,
            messagesToDelete,
            requestedBy,
            requestUrl,
        });
    }
};

// Export all functions for sending messages and media to a chat
module.exports = {
    sendChatAction,
    deleteMessages,
    sendMessage,
    sendMediaGroup,
    sendVideo,
    sendPhoto,
    sendRequestedData,
};
