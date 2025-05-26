import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { exec } from 'node:child_process';
import path from 'path';

const app = express();
const db  = new Database('./db/prices.db');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

/* 新增價格 */
app.post('/api/prices', (req, res) => {
    const { date, product, price } = req.body;
    if (!date || !product || !price) return res.status(400).json({ msg: '缺參數' });
    db.prepare('INSERT INTO prices (date, product, price) VALUES (?, ?, ?)')
        .run(date, product.trim(), Number(price));
    res.json({ msg: 'OK' });
});

/* 查詢（可帶 keyword）*/
app.get('/api/prices', (req, res) => {
    const kw = (req.query.q || '').trim();
    const rows = kw
        ? db.prepare('SELECT * FROM prices WHERE product LIKE ? ORDER BY date DESC').all(`%${kw}%`)
        : db.prepare('SELECT * FROM prices ORDER BY date DESC LIMIT 100').all();
    res.json(rows);
});

app.post('/api/reload', (_, res) => {
    try {
        // 1. 清空資料表
        db.prepare('DELETE FROM prices;').run();

        // 2. 呼叫既有的 import 腳本
        //    注意路徑跟檔名自己對一下
        const csvPath = path.resolve('data/carrot.csv');
        exec(`node scripts/import-csv.js "${csvPath}" 胡蘿蔔`, (err, stdout, stderr) => {
            if (err) {
                console.error(stderr);
                return res.status(500).json({ msg: '匯入失敗', err: stderr });
            }
            console.log(stdout);
            res.json({ msg: 'Reload OK' });
        });
    } catch (e) {
        res.status(500).json({ msg: e.message });
    }
});

/* 啟動 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 伺服器跑在 http://localhost:${PORT}`));
