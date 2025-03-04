const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { REQUEST_STATUS } = require('../constants');
const { addOrUpdate, remove, readJSON } = require('../config/jsonDatabase');

const FILENAME = 'contentRequests';

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

const create = async (data) => {
  addOrUpdate(FILENAME, data, 'id');
};

const update = async (data, where) => {
  const items = readJSON(FILENAME);
  const item = items.find((i) => i.id === where.id);
  if (item) {
    Object.assign(item, data);
    addOrUpdate(FILENAME, item, 'id');
  }
};

const destroy = async (where) => {
  remove(FILENAME, 'id', where.id);
};

const findOrCreate = async ({ where, defaults }) => {
  const items = readJSON(FILENAME);
  let item = items.find((i) => i.id === where.id);
  if (!item) {
    item = { ...defaults, id: where.id };
    addOrUpdate(FILENAME, item, 'id');
    return [item, true];
  }
  return [item, false];
};

const findAll = async (where) => {
  const items = readJSON(FILENAME);
  return items.filter((item) => {
    return Object.keys(where).every((key) => item[key] === where[key]);
  });
};

module.exports = {
  create,
  update,
  destroy,
  findOrCreate,
  findAll,
};
