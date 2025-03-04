const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Metrics = sequelize.define('Metrics', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  totalRequests: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  mediaProcessed_GraphVideo: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  mediaProcessed_GraphImage: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  mediaProcessed_GraphSidecar: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'metrics',
  timestamps: false
});

module.exports = Metrics;
