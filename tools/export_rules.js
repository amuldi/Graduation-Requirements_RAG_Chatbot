// checker.js 의 졸업 규칙을 data/checker_rules.json 으로 내보낸다 (노트북이 같은 규칙을 쓰도록)
const fs = require('fs'), path = require('path');
const { CHECKER_GROUPS, COMMON_TABLE } = require('../src/checker.js');
fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '../data/checker_rules.json'),
  JSON.stringify({ common: COMMON_TABLE, groups: CHECKER_GROUPS }, null, 1), 'utf-8');
console.log('data/checker_rules.json 생성');
