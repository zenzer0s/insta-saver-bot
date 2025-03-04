const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  chatId: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  userName: {
    type: DataTypes.STRING
  },
  firstName: {
    type: DataTypes.STRING
  },
  requestCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: false
});

module.exports = User;
