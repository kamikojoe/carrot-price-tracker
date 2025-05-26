const $ = (sel) => document.querySelector(sel);
const api = '/api/prices';
const PAGE_SIZE = 100;

let chart;          // Chart.js 實例
let currentPage = 1;
let currentKw   = '';

/* ---------- 折線圖 ---------- */
async function drawChart() {
    const gran   = $('#gran').value;
    const res    = await fetch(`/api/trend?product=胡蘿蔔&gran=${gran}`);
    const { rows } = await res.json();
    const labels = rows.map(r => r.period);
    const prices = rows.map(r => r.avg_price);

    const ctx = $('#trend').getContext('2d');
    if (chart) chart.destroy();          // 重新繪製
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{ label: '胡蘿蔔 (元/公斤)', data: prices, tension: .2 }]
        },
        options: {
            responsive: true,
            scales: { x: { ticks: { autoSkip: true, maxTicksLimit: 12 } } } // 最多 12 個標籤
        }
    });
}

/* ---------- 載入表格 + 分頁 ---------- */
async function load(page = 1, kw = '') {
    const url = new URL(api, location.origin);
    url.searchParams.set('page', page);
    if (kw) url.searchParams.set('q', kw);

    const { rows, totalPages } = await (await fetch(url)).json();

    // 表格
    $('#list tbody').innerHTML = rows
        .map(r => `<tr><td>${r.date}</td><td>${r.product}</td><td>${r.price}</td></tr>`)
        .join('');

    // 分頁
    const pagers = Array.from({ length: totalPages }, (_, i) => {
        const p = i + 1;
        return `<button class="page-btn${p === page ? ' active' : ''}" data-p="${p}">${p}</button>`;
    }).join('');
    $('#pagination').innerHTML = pagers;

    // 記錄狀態
    currentPage = page;
    currentKw   = kw;
}

/* ---------- 監聽 ---------- */
$('#pagination').addEventListener('click', (e) => {
    if (!e.target.matches('.page-btn')) return;
    load(Number(e.target.dataset.p), currentKw);
});

$('#kw').oninput = (e) => load(1, e.target.value);

$('#add').onclick = async () => {
    const body = {
        date:    $('#date').value,
        product: $('#product').value,
        price:   $('#price').value
    };
    await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    drawChart();
    load(currentPage, currentKw);
};

$('#reload').onclick = async () => {
    if (!confirm('確定重新匯入 CSV？')) return;
    $('#reload').disabled = true;
    await fetch('/api/reload', { method: 'POST' });
    $('#reload').disabled = false;
    drawChart();
    load(1, '');
};

$('#gran').onchange = () => drawChart();


/* ---------- 初始 ---------- */
drawChart();
load();
