const { Sequelize } = require('sequelize');
const path = require('path');
const { log } = require('../utils');

// Define the database file path
const dbPath = path.join(__dirname, '../../database.sqlite');

// Create Sequelize instance
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false
});

// Function to connect to the database
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    log("SQLite database connected successfully");
    
    // Sync all models
    await sequelize.sync();
    log("Database models synchronized");
  } catch (error) {
    log("Error connecting to SQLite database:", error);
    process.exit(1);
  }
};

module.exports = {
  connectDB,
  sequelize
};
