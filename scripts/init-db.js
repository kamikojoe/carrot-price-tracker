import Database from 'better-sqlite3';
import fs from 'node:fs';
const db = new Database('./db/prices.db');

const schema = fs.readFileSync('./db/schema.sql', 'utf8');
db.exec(schema);

console.log('資料庫已初始化');
