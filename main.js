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

// format Date to Brazilian order with dashes: DD-MM-YYYY-HH-MM-SS
function formatBrazilDateTime(d) {
    const dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt)) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const dd = pad(dt.getDate());
    const mm = pad(dt.getMonth() + 1);
    const yyyy = dt.getFullYear();
    const hh = pad(dt.getHours());
    const min = pad(dt.getMinutes());
    const ss = pad(dt.getSeconds());
    return `${dd}-${mm}-${yyyy}-${hh}-${min}-${ss}`;
}

// format Date to Brazilian date only: DD-MM-YYYY
function formatBrazilDate(d) {
    const dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt)) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const dd = pad(dt.getDate());
    const mm = pad(dt.getMonth() + 1);
    const yyyy = dt.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
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
    // Show ID, Data, Início do trabalho, Início do almoço, Término do almoço, Hora de saída, Saldo
    const headers = ['ID','Data','Início do trabalho','Início do almoço','Término do almoço','Hora de saída','Saldo'];
    headers.forEach(h => { const th = document.createElement('th'); th.textContent = h; theadRow.appendChild(th); });

    const tbody = document.querySelector('#hoursTable tbody');
    tbody.innerHTML = '';
    records.forEach(r => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', r.id);
        tr.classList.add('selectable');
        tr.tabIndex = 0;
        // ensure date shows Brazilian formatted date (DD-MM-YYYY) if available
        let displayDate = r.dateDisplay || '';
        try {
            const dt = r.date ? new Date(r.date) : null;
            if (dt && !isNaN(dt)) displayDate = formatBrazilDate(dt);
        } catch (err) { /* ignore */ }
        const startWorkDisplay = r.startWork || '';
        const lunchStartDisplay = r.lunchStart || '';
        const lunchEndDisplay = r.lunchEnd || '';
        const actualExitDisplay = r.actualExit || '';
        const cells = [r.id, displayDate, startWorkDisplay, lunchStartDisplay, lunchEndDisplay, actualExitDisplay, r.balanceDisplay];
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
    // label spans all but last column
    tdLabel.colSpan = Math.max(1, headers.length - 1);
    tdLabel.textContent = 'Saldo total acumulado';
    const tdVal = document.createElement('td');
    const totalBalance = records.reduce((s, r) => s + (r.balanceMinutes || 0), 0);
    tdVal.textContent = (totalBalance >= 0 ? '+' : '-') + minutesToTime(Math.abs(totalBalance));
    tdVal.className = totalBalance >= 0 ? 'positive' : 'negative';
    footTr.appendChild(tdLabel);
    footTr.appendChild(tdVal);
    tfoot.appendChild(footTr);
}

function addRecordAndRender({ workedBeforeLunch, afternoonWorked, overtimeMinutes, requiredMinutes, expectedExit, actualExit, startWorkVal, lunchStartVal, lunchEndVal, actualExitVal }, reportObj) {
    const id = getNextId();
    const morning = minutesToTime(workedBeforeLunch);
    const afternoon = minutesToTime(afternoonWorked);
    const extras = minutesToTime(overtimeMinutes);
    const total = minutesToTime(workedBeforeLunch + afternoonWorked);
    const required = minutesToTime(requiredMinutes);
    const balanceMinutes = workedBeforeLunch + afternoonWorked - requiredMinutes;
    const balanceDisplay = (balanceMinutes >= 0 ? '+' : '-') + minutesToTime(Math.abs(balanceMinutes));
    // store datetime in ISO (for machine) and a formatted display in Brazilian style
    const now = new Date();
    const dateRaw = now.toISOString();
    const dateDisplay = formatBrazilDate(now); // store date only for table
    const rec = {
        id,
        date: dateRaw,
        dateDisplay,
        startWork: startWorkVal || '',
        lunchStart: lunchStartVal || '',
        lunchEnd: lunchEndVal || '',
        actualExit: actualExitVal || null,
        morning,
        afternoon,
        extras,
        total,
        required,
        balanceMinutes,
        balanceDisplay,
        expectedExit,
        actualExitRaw: actualExit || null
    };
    const records = loadRecords();
    records.push(rec);
    saveRecords(records);
    // update in-memory cache
    window.__recordsCache.push(rec);
    renderRecordsTable(records);
    // keep last report object (used by TXT/Excel/PDF exports) alongside the saved record
    window.__lastReport = { expectedExit, actualExit: actualExit || null, report: reportObj || null, record: rec };
}

// Export helpers now read from window.__lastReport.report
function exportTxt() {
    if (!tableHasData()) { alert('Calcule antes de exportar.'); return; }
    const data = getTableData();
    if (!data) { alert('Tabela não encontrada para exportar.'); return; }
    const lines = [];
    // header line
    if (data.headers && data.headers.length) lines.push(data.headers.join(' | '));
    // rows
    data.rows.forEach(r => lines.push(r.join(' | ')));
    // footer
    if (data.footer) {
        lines.push('');
        lines.push(data.footer.join(' | '));
    }
    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'saldo_horas.txt';
    a.click();
}

function exportPdf() {
    if (!tableHasData()) { alert('Calcule antes de exportar.'); return; }
    const data = getTableData();
    if (!data) { alert('Tabela não encontrada para exportar.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 10;
    doc.setFontSize(12);
    // header
    if (data.headers && data.headers.length) {
        doc.text(data.headers.join(' | '), 10, y); y += 8;
    }
    // rows
    data.rows.forEach(row => {
        doc.text(row.join(' | '), 10, y); y += 8;
        if (y > 280) { doc.addPage(); y = 10; }
    });
    // footer
    if (data.footer) {
        y += 4;
        doc.text(data.footer.join(' | '), 10, y);
    }
    doc.save('saldo_horas.pdf');
}

function exportExcel() {
    // if table visible has data use it, otherwise try to use last generated report as fallback
    let data = null;
    if (tableHasData()) {
        data = getTableData();
    } else if (window.__lastReport && window.__lastReport.report) {
        const rpt = window.__lastReport.report;
        const headers = rpt.headers ? rpt.headers.slice() : [];
        const rows = [rpt.values ? rpt.values.slice() : []];
        const footer = rpt.totals ? [ 'Saldo total', (rpt.totals.balanceMinutes >= 0 ? '+' : '-') + minutesToTime(Math.abs(rpt.totals.balanceMinutes)) ] : null;
        data = { headers, rows, footer };
    }

    if (!data) { alert('Calcule antes de exportar.'); return; }

    const lines = [];
    if (data.headers && data.headers.length) lines.push(data.headers);
    data.rows.forEach(r => lines.push(r));
    if (data.footer) lines.push(data.footer);

    const csv = lines.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // build filename with date using '-' as separator: saldoHoras-DD-MM-YYYY.csv
    function filenameWithDatetime(base) {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const d = pad(now.getDate());
        const m = pad(now.getMonth() + 1);
        const y = now.getFullYear();
        // Brazilian date order: DD-MM-YYYY (no time)
        return `${base}-${d}-${m}-${y}.csv`;
    }

    a.download = filenameWithDatetime('saldoHoras');
    a.style.display = 'none';
    document.body.appendChild(a);
    // Some browsers require user gesture; attempt to focus and click
    a.focus();
    a.click();

    setTimeout(() => {
        try { document.body.removeChild(a); } catch (e) {}
        URL.revokeObjectURL(url);
    }, 1500);
}

// ensure exportTableCsv uses same helper
function exportTableCsv() {
    if (!tableHasData()) { alert('Calcule antes de exportar.'); return; }
    const data = getTableData();
    if (!data) { alert('Tabela não encontrada para exportar.'); return; }
    const lines = [];
    if (data.headers && data.headers.length) lines.push(data.headers);
    data.rows.forEach(r => lines.push(r));
    if (data.footer) lines.push(data.footer);
    const csv = lines.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'saldo_horas_table.csv';
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

// New: trigger calculation when user presses Enter while focusing any input inside the left panel
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const active = document.activeElement;
    if (!active) return;
    // don't trigger when focus is on a button or link
    const tag = active.tagName && active.tagName.toUpperCase();
    if (tag === 'BUTTON' || tag === 'A') return;
    // if focus is inside the left column inputs, run calculate
    const leftPane = active.closest && active.closest('.left');
    if (leftPane) {
        e.preventDefault();
        // call the same handler as the button
        calculateExitTime();
    }
});

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

    // Determine actual afternoon worked and what to display in the table for Hora de saída.
    // Calculation rules:
    // - If user provided an actual exit, use it for calculation and display.
    // - If user did NOT provide actual exit:
    //    * calculations assume they left at expected exit (no extra paid hours)
    //    * but if Horas extras was filled, display in the table the expected exit plus extras so the user sees the planned extra time
    let actualExitStr = '';
    let afternoonWorked = 0;
    let displayedActualExit = '';
    if (actualExit) {
        actualExitStr = actualExit;
        displayedActualExit = actualExit;
        const actualExitM = timeToMinutes(actualExit);
        // compute afternoon worked using lunchEndMinutes -> actualExitM
        let aft = actualExitM - lunchEndMinutes;
        if (aft < 0) aft += 24*60;
        afternoonWorked = Math.max(0, aft);
    } else {
        // no actual exit provided: calculations assume expected exit (no overtime paid)
        actualExitStr = expectedExitStr;
        afternoonWorked = remainingNeeded; // only the needed minutes (no overtime)
        // display extras in table if extras were provided
        if (overtimeMinutes > 0) {
            const dispExitMinutes = (expectedExitMinutes + overtimeMinutes) % (24*60);
            displayedActualExit = minutesToTime(dispExitMinutes);
        } else {
            displayedActualExit = expectedExitStr;
        }
    }

    const balanceMinutes = workedBeforeLunch + afternoonWorked - requiredMinutes;

    // update result UI
    const resultEl = document.getElementById('result');
    if (resultEl) resultEl.textContent = expectedExitStr + (actualExitStr ? ' / ' + actualExitStr : '');

    // build report and render
    const report = buildReport({ workedBeforeLunch, afternoonWorked, overtimeMinutes, requiredMinutes, expectedExit: expectedExitStr, actualExit: actualExitStr || null });
    renderTableReport(report);

    // persist input values and add record (pass the report so exports can use it)
    saveData();
    addRecordAndRender({
        workedBeforeLunch,
        afternoonWorked,
        overtimeMinutes,
        requiredMinutes,
        expectedExit: expectedExitStr,
        actualExit: actualExitStr || null,
        startWorkVal: startWork,
        lunchStartVal: lunchStart,
        lunchEndVal: lunchEnd,
        actualExitVal: displayedActualExit
    }, report);
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
        // show date-only in the label for clarity
        let displayDate = r.dateDisplay || '';
        try {
            const dt = r.date ? new Date(r.date) : null;
            if (dt && !isNaN(dt)) displayDate = formatBrazilDate(dt);
        } catch (err) { /* ignore */ }
        cb.setAttribute('aria-label', `Selecionar registro ${r.id} - ${displayDate}`);
        const span = document.createElement('span');
        span.textContent = `ID ${r.id} — ${displayDate} — Saldo: ${r.balanceDisplay}`;
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

// wire Export button to CSV-only export
const exportBtn = document.getElementById('exportBtn');
if (exportBtn) exportBtn.addEventListener('click', (e) => { e.preventDefault(); exportExcel(); });

function tableHasData() {
    const table = document.getElementById('hoursTable');
    if (!table) return false;
    const bodyRows = table.querySelectorAll('tbody tr');
    // consider table has data if there's at least one row with at least one non-empty cell
    for (const r of bodyRows) {
        const cells = Array.from(r.querySelectorAll('td')).map(td => td.textContent.trim());
        if (cells.some(c => c !== '')) return true;
    }
    return false;
}

function getTableData() {
    const table = document.getElementById('hoursTable');
    if (!table) return null;

    // Helper: expand a table row into an array of cell text values taking colspan into account
    function expandRow(tr) {
        const cells = Array.from(tr.querySelectorAll('th,td'));
        const out = [];
        cells.forEach(cell => {
            const colspan = parseInt(cell.getAttribute('colspan') || '1', 10) || 1;
            const text = cell.textContent.trim();
            out.push(text);
            // insert empty placeholders for spanned columns so the resulting array reflects visual columns
            for (let i = 1; i < colspan; i++) out.push('');
        });
        return out;
    }

    // Collect header rows (if multiple thead rows exist we'll concatenate them)
    const theadRows = Array.from(table.querySelectorAll('thead tr'));
    let headers = [];
    if (theadRows.length > 0) {
        theadRows.forEach(tr => {
            const expanded = expandRow(tr);
            headers = headers.concat(expanded);
        });
    }

    // Collect body rows
    const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
    const rows = bodyRows.map(tr => expandRow(tr));

    // Collect footer row (single)
    const footTr = table.querySelector('tfoot tr');
    const footer = footTr ? expandRow(footTr) : null;

    // Determine expected column count (max of header, any row, footer)
    const counts = [headers.length, ...(rows.map(r => r.length)), (footer ? footer.length : 0)];
    const columns = Math.max(0, ...counts);

    // Normalize lengths by padding with empty strings so every row has the same number of columns
    if (headers.length === 0 && columns > 0) headers = Array(columns).fill('');
    if (headers.length < columns) headers = headers.concat(Array(columns - headers.length).fill(''));

    const normRows = rows.map(r => (r.length < columns ? r.concat(Array(columns - r.length).fill('')) : r.slice(0, columns)));
    const normFooter = footer ? (footer.length < columns ? footer.concat(Array(columns - footer.length).fill('')) : footer.slice(0, columns)) : null;

    return { headers, rows: normRows, footer: normFooter };
}
