// scripts/import-csv.js
import fs from 'node:fs';
import { parse } from 'csv-parse';
import Database from 'better-sqlite3';
import iconv from 'iconv-lite';

/* ---------- CLI 參數 ---------- */
const csvPath = process.argv[2] ?? './data/carrot.csv';   // CSV 路徑
const product = process.argv[3] ?? '胡蘿蔔';              // 商品名稱

/* ---------- 開啟資料庫 ---------- */
const db = new Database('./db/prices.db');
const insert = db.prepare(
    'INSERT INTO prices (date, product, price) VALUES (?, ?, ?)'
);

/* ---------- 解析 CSV ---------- */
const parser = parse({
    columns: true,
    skip_empty_lines: true,
    trim: true,
    // 若分隔符是 Tab 或分號，轉這裡：
    // delimiter: '\t',
});

const rows = [];
let first = false; // 是否輸出第一row欄位名稱

const isDate = (txt) => /^\d{2,4}[-\/.]\d{2}[-\/.]\d{2}$/.test(txt);

// 民國年 114/05/25 → 2025-05-25
const roc2iso = (d) => {
    const m = d.match(/^(\d{2,3})[\/.-](\d{2})[\/.-](\d{2})$/);
    if (!m) return d.replace(/\//g, '-');      // 已是西元或含破折號，就直接換成 -
    const [_, y, mo, da] = m;
    const isoY = (+y + 1911).toString();
    return `${isoY}-${mo}-${da}`;
};

fs.createReadStream(csvPath)
    .pipe(iconv.decodeStream('big5'))
    .pipe(parser)
    .on('data', (record) => {
        if (first) {
            console.log('讀到欄位名稱：', Object.keys(record));
            first = false;
        }

        const norm = (s) => s.replace(/\s|[\u3000\uFEFF]/g, '');
        const nkeys = Object.fromEntries(
            Object.entries(record).map(([k, v]) => [norm(k), v])
        );

        const dateRaw = nkeys['日期'] || nkeys['日　　期'] || nkeys['成交日期'] || nkeys['Date'];
        const price   = nkeys['平均價(元/公斤)'] || nkeys['平均價'] || nkeys['Price'];

        if (!dateRaw || !price) return;        // 空值跳過

        const dateISO = roc2iso(dateRaw);      // ★ 轉成 ISO
        if (!isDate(dateISO)) return;          // 小計或異常格式跳過

        rows.push({ date: dateISO, price: Number(price) });
    })
    .on('end', () => {
        console.log(`CSV 讀取完畢，共 ${rows.length} 筆，準備匯入…`);

        const tx = db.transaction((items) => {
            for (const { date, price } of items) {
                insert.run(date, product, price);
            }
        });
        tx(rows);

        console.log('匯入完成！');
        // console.log('試試看：curl http://localhost:3000/api/prices?q=胡蘿蔔&limit=5');
    })
    .on('error', (err) => console.error('💥 解析錯誤：', err.message));
