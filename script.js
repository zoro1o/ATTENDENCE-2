/* =============================================================
   script.js — AttendanceIQ Dashboard
   ============================================================= */

// !! SET YOUR GOOGLE APPS SCRIPT URL HERE !!
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";

/* ── AUTH GUARD ──────────────────────────────────────────── */
if (sessionStorage.getItem("att_auth") !== "true") {
  window.location.replace("index.html");
}
document.getElementById("tbEmail").textContent = sessionStorage.getItem("att_email") || "";

/* ── STATE ───────────────────────────────────────────────── */
let allRecords   = [];
let studentMap   = {};
let sessionDates = [];

/* ── BOOT ────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", loadData);

/* ── LOAD DATA ───────────────────────────────────────────── */
async function loadData() {
  showLoader(true);
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?mode=read&t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    processData(raw);
  } catch (err) {
    console.warn("Live fetch failed, using demo data:", err);
    processData(getDemoData());
    showInfoBanner("Demo mode — set your APPS_SCRIPT_URL in script.js to load live data.");
  } finally {
    renderAll();
    showLoader(false);
    document.getElementById("dashPage").style.display = "block";
  }
}

/* ── PROCESS ─────────────────────────────────────────────── */
function processData(raw) {
  const today = todayStr();

  allRecords = raw.map(r => ({
    name: r.name || r.Name || "Unknown",
    roll: String(r.roll || r.Roll || "—"),
    date: r.date || r.Date || today
  }));

  studentMap = {};
  const dateSet = new Set();

  allRecords.forEach(rec => {
    const k = rec.roll;
    if (!studentMap[k]) {
      studentMap[k] = { name: rec.name, roll: rec.roll, dates: new Set(), lastSeen: "" };
    }
    studentMap[k].dates.add(rec.date);
    if (!studentMap[k].lastSeen || rec.date > studentMap[k].lastSeen) {
      studentMap[k].lastSeen = rec.date;
    }
    dateSet.add(rec.date);
  });

  sessionDates = [...dateSet].sort();
}

/* ── RENDER ALL ──────────────────────────────────────────── */
function renderAll() {
  const students   = Object.values(studentMap);
  const totalClass = sessionDates.length;
  const totalStud  = students.length;
  const avgPct     = totalStud === 0 ? 0
    : Math.round(students.reduce((a, s) => a + (s.dates.size / Math.max(totalClass, 1)) * 100, 0) / totalStud);

  // Stat cards
  setText("scClasses",  totalClass);
  setText("scStudents", totalStud);
  setText("scAvg",      `${avgPct}%`);
  setText("scLast",     sessionDates[sessionDates.length - 1] || "—");
  setText("pageSubtitle", `${totalClass} sessions · ${totalStud} students · last updated just now`);

  renderBarChart();
  renderDonutChart(avgPct);
  renderSessionCards();
  populateFilter();
  renderTable(students);
}

/* ── BAR CHART ───────────────────────────────────────────── */
let barChart;
function renderBarChart() {
  setText("sessionTag", `${sessionDates.length} sessions`);

  const labels = sessionDates;
  const data   = sessionDates.map(d => allRecords.filter(r => r.date === d).length);

  const ctx = document.getElementById("barChart").getContext("2d");
  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Present",
        data,
        backgroundColor: "rgba(26,86,219,0.15)",
        borderColor: "rgba(26,86,219,0.7)",
        borderWidth: 1.5,
        borderRadius: 5,
        hoverBackgroundColor: "rgba(26,86,219,0.25)"
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#fff",
          borderColor: "#e2e4e9",
          borderWidth: 1,
          titleColor: "#1a1d23",
          bodyColor: "#5a5f6e",
          padding: 10,
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)"
        }
      },
      scales: {
        x: {
          ticks: { color: "#9298a8", font: { family: "'Source Sans 3', sans-serif", size: 11 } },
          grid:  { color: "rgba(0,0,0,0.04)" }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#9298a8", font: { family: "'Source Sans 3', sans-serif", size: 11 }, precision: 0 },
          grid:  { color: "rgba(0,0,0,0.04)" }
        }
      }
    }
  });
}

/* ── DONUT CHART ─────────────────────────────────────────── */
let donutChart;
function renderDonutChart(avgPct) {
  setText("donutVal", `${avgPct}%`);

  const ctx = document.getElementById("donutChart").getContext("2d");
  if (donutChart) donutChart.destroy();

  donutChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Present", "Absent"],
      datasets: [{
        data: [avgPct, 100 - avgPct],
        backgroundColor: ["rgba(26,86,219,0.8)", "rgba(226,228,233,0.8)"],
        borderColor:     ["#1a56db", "#e2e4e9"],
        borderWidth: 1.5,
        hoverOffset: 4
      }]
    },
    options: {
      cutout: "70%", responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#5a5f6e", font: { size: 11 }, padding: 14, boxWidth: 10 }
        },
        tooltip: {
          backgroundColor: "#fff",
          borderColor: "#e2e4e9", borderWidth: 1,
          titleColor: "#1a1d23", bodyColor: "#5a5f6e",
          callbacks: { label: c => ` ${c.parsed}%` }
        }
      }
    }
  });
}

/* ── SESSION CARDS ───────────────────────────────────────── */
function renderSessionCards() {
  const el = document.getElementById("sessionsList");
  if (!sessionDates.length) {
    el.innerHTML = `<p style="color:var(--text3);font-size:.85rem">No sessions found.</p>`;
    return;
  }
  el.innerHTML = sessionDates.map((d, i) => {
    const count = allRecords.filter(r => r.date === d).length;
    return `
      <div class="sl-card">
        <div class="sl-num">Session ${i + 1}</div>
        <div class="sl-date">${d}</div>
        <div class="sl-count">${count}</div>
        <div class="sl-students">students present</div>
      </div>`;
  }).join("");
}

/* ── DATE FILTER ─────────────────────────────────────────── */
function populateFilter() {
  const sel = document.getElementById("sessionFilter");
  sel.innerHTML = `<option value="all">All Sessions</option>`;
  sessionDates.forEach(d => {
    sel.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

/* ── TABLE ───────────────────────────────────────────────── */
function renderTable(students) {
  const tbody = document.getElementById("tableBody");
  if (!students.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="td-empty">No records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = students.map((s, i) => {
    const present  = s.dates.size;
    const total    = sessionDates.length || 1;
    const pct      = Math.round((present / total) * 100);
    const badgeCls = pct >= 75 ? "att-high" : pct >= 50 ? "att-mid" : "att-low";

    const dots = sessionDates.map(d =>
      `<div class="dot-s ${s.dates.has(d) ? "dot-p" : "dot-a"}" title="${d}: ${s.dates.has(d) ? "Present" : "Absent"}"></div>`
    ).join("");

    return `<tr>
      <td style="color:var(--text3);font-size:.78rem">${i + 1}</td>
      <td style="font-weight:600">${esc(s.name)}</td>
      <td><span class="roll-tag">${esc(s.roll)}</span></td>
      <td style="font-weight:600">${present}</td>
      <td style="color:var(--text2)">${sessionDates.length}</td>
      <td><span class="att-badge ${badgeCls}">${pct}%</span></td>
      <td style="font-size:.78rem;color:var(--text2)">${s.lastSeen || "—"}</td>
      <td><div class="dot-track">${dots}</div></td>
    </tr>`;
  }).join("");
}

/* ── FILTER ──────────────────────────────────────────────── */
function filterTable() {
  const q    = document.getElementById("searchBox").value.toLowerCase();
  const date = document.getElementById("sessionFilter").value;

  let rows = Object.values(studentMap);

  if (date !== "all") rows = rows.filter(s => s.dates.has(date));
  if (q)             rows = rows.filter(s =>
    s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q)
  );

  renderTable(rows);
}

/* ── LOGOUT ──────────────────────────────────────────────── */
function logout() {
  sessionStorage.clear();
  window.location.replace("index.html");
}

/* ── HELPERS ─────────────────────────────────────────────── */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function showLoader(on) {
  document.getElementById("loadingScreen").style.display = on ? "flex" : "none";
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function esc(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function showInfoBanner(msg) {
  const b = document.createElement("div");
  b.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:#1e40af;color:#fff;border-radius:8px;padding:10px 20px;
    font-size:.78rem;font-family:'Source Sans 3',sans-serif;z-index:9999;
    box-shadow:0 4px 16px rgba(0,0,0,0.15);`;
  b.textContent = msg;
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 7000);
}

/* ── DEMO DATA ───────────────────────────────────────────── */
function getDemoData() {
  const students = [
    { name: "Krittan Saha",   roll: "023" },
    { name: "Nabajyoti Talukdar", roll: "026" },
    { name: "Pratim Jyoti Goswami",     roll: "033" },
    { name: "Ankita Sharma",   roll: "012" },
    { name: "Rohit Kumar",     roll: "045" },
    { name: "Priya Gogoi",     roll: "018" },
    { name: "Sourav Das",      roll: "052" },
  ];
  const dates = ["2025-06-02","2025-06-04","2025-06-06","2025-06-09","2025-06-11","2025-06-13"];
  const out = [];
  students.forEach(s => {
    dates.forEach(d => {
      if (Math.random() > 0.28) out.push({ name: s.name, roll: s.roll, date: d });
    });
  });
  return out;
}
