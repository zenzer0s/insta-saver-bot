const Bot = require('./telegram');
const Browser = require('./browser');
const { connectDB } = require('./database');

module.exports = {
    Bot,
    Browser,
    connectDB
};
