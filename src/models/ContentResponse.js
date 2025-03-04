const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ContentResponse = sequelize.define('ContentResponse', {
  owner_userName: {
    type: DataTypes.STRING
  },
  owner_avatarUrl: {
    type: DataTypes.STRING
  },
  owner_fullName: {
    type: DataTypes.STRING
  },
  requestedBy_userName: {
    type: DataTypes.STRING
  },
  requestedBy_firstName: {
    type: DataTypes.STRING
  },
  requestUrl: {
    type: DataTypes.STRING
  },
  shortCode: {
    type: DataTypes.STRING
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  mediaUrl: {
    type: DataTypes.STRING
  },
  mediaType: {
    type: DataTypes.STRING
  },
  captionText: {
    type: DataTypes.TEXT
  },
  displayUrl: {
    type: DataTypes.STRING
  },
  thumbnailUrl: {
    type: DataTypes.STRING
  },
  videoUrl: {
    type: DataTypes.STRING
  },
  mediaList: {
    type: DataTypes.TEXT, // Store JSON as text
    get() {
      const value = this.getDataValue('mediaList');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('mediaList', JSON.stringify(value));
    }
  }
}, {
  tableName: 'contentResponse',
  timestamps: false
});

module.exports = ContentResponse;
