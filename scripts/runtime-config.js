const fs = require('fs');
const path = require('path');

function loadRuntimeConfig() {
  const file = path.join(process.cwd(), 'config', 'runtime.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

module.exports = { loadRuntimeConfig };
