const fields = [
    "dailyHours",
    "lunchTime",
    "startWork",
    "lunchStart",
    "lunchEnd",
    "actualExit",
    "extraHours"
];

// record storage keys
const RECORDS_KEY = 'ht_records';
const RECORD_ID_KEY = 'ht_next_id';

function saveData() {
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) localStorage.setItem(id, el.value);
    });
}

function loadData() {
    fields.forEach(id => {
        const value = localStorage.getItem(id);
        if (value) {
            const el = document.getElementById(id);
            if (el) el.value = value;
        }
    });
}

function timeToMinutes(time) {
    if (!time) return 0;
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

function minutesToTime(minutes) {
    const total = Math.round(minutes);
    const hrs = Math.floor(total / 60) % 24;
    const mins = total % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function buildRows({ workedBeforeLunch, requiredMinutes, overtimeMinutes, balance, expectedExit, actualExit }) {
    return [
        ["Horas trabalhadas pela manhã", minutesToTime(workedBeforeLunch)],
        ["Horas necessárias (dia)", minutesToTime(requiredMinutes)],
        ["Horas restantes após almoço", minutesToTime(Math.max(0, requiredMinutes - workedBeforeLunch))],
        ["Horas extras planejadas", minutesToTime(overtimeMinutes)],
        ["Saldo (extras + / a pagar -)", (balance >= 0 ? '+' : '-') + minutesToTime(Math.abs(balance))],
        ["Hora esperada de saída", expectedExit]
    ].concat(actualExit ? [["Hora de saída real", actualExit]] : []);
}

// New: build a report object for table display
function buildReport({ workedBeforeLunch, afternoonWorked, overtimeMinutes, requiredMinutes, expectedExit, actualExit }) {
    const totalWorked = workedBeforeLunch + afternoonWorked + 0; // overtime included in afternoonWorked when projected
    const balanceMinutes = totalWorked - requiredMinutes;

    const headers = [
        'Manhã',
        'Tarde',
        'Extras planejadas',
        'Total trabalhado',
        'Horas necessárias',
        'Saldo',
        'Hora esperada'
    ];
    if (actualExit) headers.push('Hora saída real');

    const values = [
        minutesToTime(workedBeforeLunch),
        minutesToTime(afternoonWorked),
        minutesToTime(overtimeMinutes),
        minutesToTime(totalWorked),
        minutesToTime(requiredMinutes),
        (balanceMinutes >= 0 ? '+' : '-') + minutesToTime(Math.abs(balanceMinutes)),
        expectedExit
    ];
    if (actualExit) values.push(actualExit);

    return {
        headers,
        values,
        totals: { balanceMinutes, totalWorked }
    };
}

// Render single-row table with headers and footer totals
function renderTableReport(report) {
    const theadRow = document.getElementById('hoursHeader');
    theadRow.innerHTML = '';
    report.headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        theadRow.appendChild(th);
    });

    const tbody = document.querySelector('#hoursTable tbody');
    tbody.innerHTML = '';
    const tr = document.createElement('tr');
    tr.classList.add('selectable');
    tr.setAttribute('tabindex', '0');
    report.values.forEach(v => {
        const td = document.createElement('td');
        td.textContent = v;
        tr.appendChild(td);
    });
    // click to toggle selection
    tr.addEventListener('click', () => tr.classList.toggle('row-selected'));
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tr.classList.toggle('row-selected'); } });
    tbody.appendChild(tr);

    const tfoot = document.querySelector('#hoursTable tfoot');
    tfoot.innerHTML = '';
    const footTr = document.createElement('tr');
    const tdLabel = document.createElement('td');
    tdLabel.colSpan = Math.max(1, report.headers.length - 1);
    tdLabel.textContent = 'Saldo total';
    const tdVal = document.createElement('td');
    tdVal.textContent = (report.totals.balanceMinutes >= 0 ? '+' : '-') + minutesToTime(Math.abs(report.totals.balanceMinutes));
    // add class to indicate positive/negative balance for styling
    tdVal.className = report.totals.balanceMinutes >= 0 ? 'positive' : 'negative';
    footTr.appendChild(tdLabel);
    footTr.appendChild(tdVal);
    tfoot.appendChild(footTr);
}

function renderTable(rows) {
    const tbody = document.querySelector('#hoursTable tbody');
    tbody.innerHTML = '';
    rows.forEach(([desc, val]) => {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td');
        td1.textContent = desc;
        const td2 = document.createElement('td');
        td2.textContent = val;
        tr.appendChild(td1);
        tr.appendChild(td2);
        tbody.appendChild(tr);
    });
}

// record storage functions
function loadRecords() {
    const raw = localStorage.getItem(RECORDS_KEY);
    return raw ? JSON.parse(raw) : [];
}
function saveRecords(records) {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}
function getNextId() {
    const raw = localStorage.getItem(RECORD_ID_KEY);
    const next = raw ? Number(raw) : 1;
    localStorage.setItem(RECORD_ID_KEY, String(next + 1));
    return next;
}

// render multi-row table
function renderRecordsTable(records) {
    const theadRow = document.getElementById('hoursHeader');
    theadRow.innerHTML = '';
    const headers = ['ID','Data','Manhã','Tarde','Extras','Total','Necessário','Saldo','Hora esperada','Saída real'];
    headers.forEach(h => { const th = document.createElement('th'); th.textContent = h; theadRow.appendChild(th); });

    const tbody = document.querySelector('#hoursTable tbody');
    tbody.innerHTML = '';
    records.forEach(r => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', r.id);
        tr.classList.add('selectable');
        tr.tabIndex = 0;
        const cells = [r.id, r.date, r.morning, r.afternoon, r.extras, r.total, r.required, r.balanceDisplay, r.expectedExit, r.actualExit || ''];
        cells.forEach(c => { const td = document.createElement('td'); td.textContent = c; tr.appendChild(td); });
        tr.addEventListener('click', () => tr.classList.toggle('row-selected'));
        tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tr.classList.toggle('row-selected'); } });
        tbody.appendChild(tr);
    });

    // footer: sum balances
    const tfoot = document.querySelector('#hoursTable tfoot');
    tfoot.innerHTML = '';
    const footTr = document.createElement('tr');
    const tdLabel = document.createElement('td');
    tdLabel.colSpan = headers.length - 1;
    tdLabel.textContent = 'Saldo total acumulado';
    const tdVal = document.createElement('td');
    const totalBalance = records.reduce((s, r) => s + r.balanceMinutes, 0);
    tdVal.textContent = (totalBalance >= 0 ? '+' : '-') + minutesToTime(Math.abs(totalBalance));
    tdVal.className = totalBalance >= 0 ? 'positive' : 'negative';
    footTr.appendChild(tdLabel);
    footTr.appendChild(tdVal);
    tfoot.appendChild(footTr);
}

function addRecordAndRender({ workedBeforeLunch, afternoonWorked, overtimeMinutes, requiredMinutes, expectedExit, actualExit }) {
    const id = getNextId();
    const morning = minutesToTime(workedBeforeLunch);
    const afternoon = minutesToTime(afternoonWorked);
    const extras = minutesToTime(overtimeMinutes);
    const total = minutesToTime(workedBeforeLunch + afternoonWorked);
    const required = minutesToTime(requiredMinutes);
    const balanceMinutes = workedBeforeLunch + afternoonWorked - requiredMinutes;
    const balanceDisplay = (balanceMinutes >= 0 ? '+' : '-') + minutesToTime(Math.abs(balanceMinutes));
    const date = new Date().toLocaleString();
    const rec = { id, date, morning, afternoon, extras, total, required, balanceMinutes, balanceDisplay, expectedExit, actualExit: actualExit || null };
    const records = loadRecords();
    records.push(rec);
    saveRecords(records);
    // update in-memory cache
    window.__recordsCache.push(rec);
    renderRecordsTable(records);
    window.__lastReport = { expectedExit, actualExit: actualExit || null, report: rec };
}

// Export helpers now read from window.__lastReport.report
function exportTxt() {
    const rpt = window.__lastReport;
    if (!rpt || !rpt.report) { alert('Calcule antes de exportar.'); return; }
    const { headers, values, totals } = rpt.report;
    const lines = [];
    headers.forEach((h, i) => lines.push(`${h}: ${values[i] || ''}`));
    lines.push('');
    lines.push(`Saldo total: ${(totals.balanceMinutes >= 0 ? '+' : '-')}${minutesToTime(Math.abs(totals.balanceMinutes))}`);
    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'saldo_horas.txt';
    a.click();
}

function exportPdf() {
    const rpt = window.__lastReport;
    if (!rpt || !rpt.report) { alert('Calcule antes de exportar.'); return; }
    const { headers, values, totals } = rpt.report;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 10;
    doc.setFontSize(12);
    headers.forEach((h, i) => { doc.text(`${h}: ${values[i] || ''}`, 10, y); y += 8; });
    y += 4;
    doc.text(`Saldo total: ${(totals.balanceMinutes >= 0 ? '+' : '-')}${minutesToTime(Math.abs(totals.balanceMinutes))}`, 10, y);
    doc.save('saldo_horas.pdf');
}

function exportExcel() {
    const rpt = window.__lastReport;
    if (!rpt || !rpt.report) { alert('Calcule antes de exportar.'); return; }
    const { headers, values, totals } = rpt.report;
    const lines = [headers];
    lines.push(values);
    lines.push(['Saldo total', (totals.balanceMinutes >= 0 ? '+' : '-') + minutesToTime(Math.abs(totals.balanceMinutes))]);
    const csv = lines.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'saldo_horas.csv';
    a.click();
}

function trapFocus(modalEl) {
    const focusableSelectors = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(modalEl.querySelectorAll(focusableSelectors)).filter(el => el.offsetParent !== null);
    if (focusable.length === 0) return () => {};
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function onKey(e) {
        if (e.key === 'Tab') {
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        } else if (e.key === 'Escape') {
            closeModal();
        }
    }

    document.addEventListener('keydown', onKey);
    // focus first element
    first.focus();

    return () => document.removeEventListener('keydown', onKey);
}

let releaseTrap = null;
let currentOpener = null;

function openDialog(modalEl, openerEl) {
    if (!modalEl) return;
    modalEl.setAttribute('aria-hidden', 'false');
    currentOpener = openerEl || null;
    releaseTrap = trapFocus(modalEl);
}

function closeDialog(modalEl) {
    if (!modalEl) return;
    modalEl.setAttribute('aria-hidden', 'true');
    if (releaseTrap) { releaseTrap(); releaseTrap = null; }
    if (currentOpener) currentOpener.focus();
    currentOpener = null;
}

// wire export modal handlers
const exportBtnEl = document.getElementById('exportBtn');
const exportModalEl = document.getElementById('exportModal');
const closeExportModalEl = document.getElementById('closeExportModal');

// export current visible table as CSV (primary action)
function exportTableCsv() {
    const table = document.getElementById('hoursTable');
    if (!table) { alert('Tabela não encontrada para exportar.'); return; }
    const rows = [];
    const ths = Array.from(table.querySelectorAll('thead th'));
    if (ths.length) rows.push(ths.map(th => th.textContent.trim()));
    const trs = Array.from(table.querySelectorAll('tbody tr'));
    trs.forEach(tr => {
        const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
        rows.push(cells);
    });
    // include footer if present
    const footRows = Array.from(table.querySelectorAll('tfoot tr'));
    footRows.forEach(fr => {
        const cells = Array.from(fr.querySelectorAll('td')).map(td => td.textContent.trim());
        rows.push(cells);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'saldo_horas_table.csv';
    a.click();
}

if (exportBtnEl) {
    // normal click -> export CSV directly
    exportBtnEl.addEventListener('click', (e) => {
        if (e.shiftKey) {
            // shift+click opens modal for format selection
            openDialog(exportModalEl, exportBtnEl);
        } else {
            exportTableCsv();
        }
    });
}
if (closeExportModalEl) closeExportModalEl.addEventListener('click', () => closeDialog(exportModalEl));

// modal option buttons for export
const modalOptionButtons = document.querySelectorAll('#exportModal .modal-option');
modalOptionButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const type = e.currentTarget.getAttribute('data-type');
        closeDialog(exportModalEl);
        if (type === 'txt') exportTxt();
        if (type === 'pdf') exportPdf();
        if (type === 'csv') exportTableCsv();
    });
});

if (exportModalEl) exportModalEl.addEventListener('click', (e) => { if (e.target === exportModalEl) closeDialog(exportModalEl); });

// wire clear modal handlers
const clearBtnEl2 = document.getElementById('clearBtn');
const clearModalEl = document.getElementById('clearModal');
const closeClearModalEl2 = document.getElementById('closeClearModal');
if (clearBtnEl2) clearBtnEl2.addEventListener('click', () => openDialog(clearModalEl, clearBtnEl2));
if (closeClearModalEl2) closeClearModalEl2.addEventListener('click', () => closeDialog(clearModalEl));

if (clearModalEl) clearModalEl.addEventListener('click', (e) => { if (e.target === clearModalEl) closeDialog(clearModalEl); });

// clear modal actions
const clearAllBtnEl = document.getElementById('clearAllBtn');
const clearSelectedBtnEl = document.getElementById('clearSelectedBtn');
if (clearAllBtnEl) clearAllBtnEl.addEventListener('click', () => {
    if (!confirm('Deseja realmente remover todos os registros? Esta ação não pode ser desfeita.')) return;
    localStorage.removeItem(RECORDS_KEY);
    localStorage.removeItem(RECORD_ID_KEY);
    // keep in-memory cache empty
    window.__recordsCache = [];
    renderRecordsTable([]);
    if (clearModalEl) closeDialog(clearModalEl);
});
if (clearSelectedBtnEl) clearSelectedBtnEl.addEventListener('click', () => {
    const container = document.getElementById('clearListContainer');
    if (!container) return;
    const checked = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'));
    if (checked.length === 0) {
        alert('Selecione ao menos um registro para limpar.');
        return;
    }
    const ids = checked.map(cb => Number(cb.value));
    let records = loadRecords();
    records = records.filter(r => !ids.includes(r.id));
    saveRecords(records);
    // update in-memory cache
    window.__recordsCache = records.slice();
    renderRecordsTable(records);
    if (clearModalEl) closeDialog(clearModalEl);
});

// ensure calculate button is bound (safe)
const calculateBtnEl = document.getElementById('calculateBtn');
if (calculateBtnEl) calculateBtnEl.addEventListener('click', calculateExitTime);

// calculateExitTime: compute expected exit based on inputs, update UI, render table and save record
function calculateExitTime() {
    const dailyHoursEl = document.getElementById('dailyHours');
    const lunchTimeEl = document.getElementById('lunchTime');
    const startWorkEl = document.getElementById('startWork');
    const lunchStartEl = document.getElementById('lunchStart');
    const lunchEndEl = document.getElementById('lunchEnd');
    const actualExitEl = document.getElementById('actualExit');
    const extraHoursEl = document.getElementById('extraHours');

    const dailyHours = dailyHoursEl ? dailyHoursEl.value : '';
    const lunchTime = lunchTimeEl ? lunchTimeEl.value : '';
    const startWork = startWorkEl ? startWorkEl.value : '';
    const lunchStart = lunchStartEl ? lunchStartEl.value : '';
    const lunchEnd = lunchEndEl ? lunchEndEl.value : '';
    const actualExit = actualExitEl ? actualExitEl.value : '';
    const extraHours = extraHoursEl ? extraHoursEl.value : '';

    if (!startWork) { alert('Informe o início do trabalho.'); return; }

    const requiredMinutes = timeToMinutes(dailyHours || '00:00');
    const lunchDuration = timeToMinutes(lunchTime || '00:00');
    const overtimeMinutes = timeToMinutes(extraHours || '00:00');

    // helper to compute difference (end - start) in minutes, handling next-day wrap
    function diffMinutes(start, end) {
        const s = timeToMinutes(start || '00:00');
        const e = timeToMinutes(end || '00:00');
        let d = e - s;
        if (d < 0) d += 24 * 60;
        return d;
    }

    // determine workedBeforeLunch and concrete lunchEnd minutes
    let workedBeforeLunch = 0;
    let lunchEndMinutes = null;

    if (lunchStart && lunchEnd) {
        workedBeforeLunch = diffMinutes(startWork, lunchStart);
        lunchEndMinutes = timeToMinutes(lunchEnd);
    } else if (lunchStart && !lunchEnd) {
        workedBeforeLunch = diffMinutes(startWork, lunchStart);
        lunchEndMinutes = (timeToMinutes(lunchStart) + lunchDuration) % (24*60);
    } else if (!lunchStart && lunchEnd) {
        // infer lunch start
        lunchEndMinutes = timeToMinutes(lunchEnd);
        const inferredStart = (lunchEndMinutes - lunchDuration + 24*60) % (24*60);
        workedBeforeLunch = diffMinutes(startWork, minutesToTime(inferredStart));
    } else {
        // no lunch time anchors provided — assume lunch happens immediately after start (fallback)
        workedBeforeLunch = 0;
        lunchEndMinutes = (timeToMinutes(startWork) + lunchDuration) % (24*60);
    }

    const remainingNeeded = Math.max(0, requiredMinutes - workedBeforeLunch);
    const expectedExitMinutes = (lunchEndMinutes + remainingNeeded + overtimeMinutes) % (24*60);
    const expectedExitStr = minutesToTime(expectedExitMinutes);

    let afternoonWorked = remainingNeeded + overtimeMinutes; // projected
    let actualExitStr = '';
    if (actualExit) {
        actualExitStr = actualExit;
        const actualExitM = timeToMinutes(actualExit);
        // compute afternoon worked using lunchEndMinutes -> actualExitM
        let aft = actualExitM - lunchEndMinutes;
        if (aft < 0) aft += 24*60;
        afternoonWorked = Math.max(0, aft);
    }

    const balanceMinutes = workedBeforeLunch + afternoonWorked - requiredMinutes;

    // update result UI
    const resultEl = document.getElementById('result');
    if (resultEl) resultEl.textContent = expectedExitStr + (actualExitStr ? ' / ' + actualExitStr : '');

    // build report and render
    const report = buildReport({ workedBeforeLunch, afternoonWorked, overtimeMinutes, requiredMinutes, expectedExit: expectedExitStr, actualExit: actualExitStr || null });
    renderTableReport(report);

    // persist input values and add record
    saveData();
    addRecordAndRender({ workedBeforeLunch, afternoonWorked, overtimeMinutes, requiredMinutes, expectedExit: expectedExitStr, actualExit: actualExitStr || null });
}

// show signature on load with animation and accessible label
(function showSignature() {
    const sig = document.getElementById('signatureFooter');
    if (!sig) return;
    // make visible after small delay
    setTimeout(() => sig.classList.add('show'), 300);
    // add accessible description
    sig.setAttribute('role', 'note');
    sig.setAttribute('aria-label', 'Feito com amor. Te amo Janice');
})();

// wire signature toggle button behavior (default visible)
(function wireSignatureToggle() {
    const sig = document.getElementById('signatureFooter');
    const toggle = document.getElementById('signatureToggle');
    if (!sig) return;
    // ensure visible by default
    setTimeout(() => sig.classList.add('show'), 300);

    if (!toggle) return;
    // restore last preference from localStorage
    const collapsed = localStorage.getItem('signature_collapsed') === '1';
    if (collapsed) sig.classList.add('collapsed');

    toggle.addEventListener('click', () => {
        const isCollapsed = sig.classList.toggle('collapsed');
        localStorage.setItem('signature_collapsed', isCollapsed ? '1' : '0');
        // update aria-expanded and button label
        sig.setAttribute('aria-expanded', String(!isCollapsed));
        toggle.setAttribute('aria-label', isCollapsed ? 'Mostrar assinatura' : 'Ocultar assinatura');
    });
})();

// populate clear modal list with records (checkbox per record) and wire actions
function populateClearModalList() {
    const container = document.getElementById('clearListContainer');
    if (!container) return;
    const records = loadRecords();
    container.innerHTML = '';
    if (!records.length) {
        const p = document.createElement('p');
        p.textContent = 'Nenhum registro encontrado.';
        container.appendChild(p);
        return;
    }
    records.forEach(r => {
        const label = document.createElement('label');
        label.className = 'clear-record-item';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = r.id;
        cb.setAttribute('data-id', r.id);
        cb.setAttribute('aria-label', `Selecionar registro ${r.id} - ${r.date}`);
        const span = document.createElement('span');
        span.textContent = `ID ${r.id} — ${r.date} — Saldo: ${r.balanceDisplay}`;
        label.appendChild(cb);
        label.appendChild(span);
        container.appendChild(label);
    });
}

// refresh list whenever clear modal opens
if (clearBtnEl2) clearBtnEl2.addEventListener('click', () => { populateClearModalList(); openDialog(clearModalEl, clearBtnEl2); });

// in-memory cache always kept in window.__recordsCache and includes registration date and auto-increment id
window.__recordsCache = loadRecords();

// on load populate records
(function initRecords() {
    const records = loadRecords();
    window.__recordsCache = records.slice();
    if (records && records.length) renderRecordsTable(records);
})();
