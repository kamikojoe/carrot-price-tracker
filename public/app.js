const $ = (sel) => document.querySelector(sel);
const api = '/api/prices';

async function load(q = '') {
    const res  = await fetch(`${api}?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    const rows = data.map(r => `<tr><td>${r.date}</td><td>${r.product}</td><td>${r.price}</td></tr>`).join('');
    $('#list tbody').innerHTML = rows;
}

$('#add').onclick = async () => {
    const body = {
        date:    $('#date').value,
        product: $('#product').value,
        price:   $('#price').value
    };
    await fetch(api, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    load($('#kw').value);
};

$('#reload').onclick = async () => {
    if (!confirm('確定要清空並重新匯入資料嗎？')) return;
    const btn = $('#reload');
    btn.disabled = true; btn.textContent = '重載中…';
    const res = await fetch('/api/reload', { method: 'POST' });
    btn.disabled = false; btn.textContent = '重新匯入 CSV';

    if (res.ok) {
        alert('資料庫已重整！');
        load($('#kw').value);              // 重新載入表格
    } else {
        const { msg } = await res.json();
        alert('失敗：' + msg);
    }
};

$('#kw').oninput = (e) => load(e.target.value);

// 初次載入
load();
