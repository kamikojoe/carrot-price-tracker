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

/* 查詢（支援關鍵字 + 分頁） */
app.get('/api/prices', (req, res) => {
    const kw       = (req.query.q || '').trim();
    const page     = Math.max(1, Number(req.query.page) || 1);
    const pageSize = 100;

    const whereSql = kw ? 'WHERE product LIKE ?' : '';
    const countSql = `SELECT COUNT(*) AS total FROM prices ${whereSql}`;
    const total    = kw
        ? db.prepare(countSql).get(`%${kw}%`).total
        : db.prepare(countSql).get().total;

    const offset   = (page - 1) * pageSize;
    const dataSql  = `SELECT * FROM prices ${whereSql} ORDER BY date DESC LIMIT ? OFFSET ?`;

    const params   = kw ? [`%${kw}%`, pageSize, offset] : [pageSize, offset];
    const rows     = db.prepare(dataSql).all(...params);

    res.json({ rows, totalPages: Math.ceil(total / pageSize), page });
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

/* 折線圖資料：按日期 ASC */
app.get('/api/trend', (req, res) => {
    const product = req.query.product || '胡蘿蔔';
    const rows = db.prepare(`
      SELECT date, price
      FROM prices
      WHERE product = ?
      ORDER BY date ASC
    `).all(product);
    res.json(rows);
});


/* 啟動 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 伺服器跑在 http://localhost:${PORT}`));
