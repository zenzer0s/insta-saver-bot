const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { REQUEST_STATUS } = require('../constants');

const ContentRequest = sequelize.define('ContentRequest', {
  chatId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  requestUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  requestedBy_userName: {
    type: DataTypes.STRING
  },
  requestedBy_firstName: {
    type: DataTypes.STRING
  },
  shortCode: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: REQUEST_STATUS.PENDING
  },
  retryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  requestedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'contentRequest',
  timestamps: false
});

module.exports = ContentRequest;
