const User = require("../models/User");

const addOrUpdateUser = async (chatId, userName, firstName) => {
    try {
        // Check if the user already exists
        const [user, created] = await User.findOrCreate({
            where: { chatId },
            defaults: {
                chatId,
                userName,
                firstName,
                requestCount: 1,
                lastUpdated: new Date()
            }
        });

        if (!created) {
            // Update existing user
            user.requestCount += 1;
            user.lastUpdated = new Date();
            await user.save();
            console.log("User updated:", user.toJSON());
        } else {
            console.log("New user added:", user.toJSON());
        }

        return user;
    } catch (error) {
        console.error("Error adding or updating user:", error);
    }
};

module.exports = { addOrUpdateUser };
