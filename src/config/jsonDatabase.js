const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../data');

if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath);
}

const readJSON = (filename) => {
  const filePath = path.join(dbPath, `${filename}.json`);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
};

const writeJSON = (filename, data) => {
  const filePath = path.join(dbPath, `${filename}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const addOrUpdate = (filename, item, key) => {
  const data = readJSON(filename);
  const index = data.findIndex((i) => i[key] === item[key]);
  if (index === -1) {
    data.push(item);
  } else {
    data[index] = item;
  }
  writeJSON(filename, data);
};

const remove = (filename, key, value) => {
  const data = readJSON(filename);
  const filteredData = data.filter((item) => item[key] !== value);
  writeJSON(filename, filteredData);
};

module.exports = {
  readJSON,
  writeJSON,
  addOrUpdate,
  remove,
};