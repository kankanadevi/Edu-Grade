// EduGrade Dashboard Logic (Group L, Student Performance & At-Risk Intervention System)

const SUBJECT = sessionStorage.getItem("edugrade_subject") || "Mathematics";
const STORE_KEY = "edugrade_students_" + SUBJECT;
const API_URL_KEY = "edugrade_api_base_url";

// Determine default API base URL
function getDefaultApiBase() {
  const isLocal = window.location.hostname === "localhost" || 
                  window.location.hostname === "127.0.0.1" || 
                  window.location.protocol === "file:";
  return isLocal ? "http://127.0.0.1:8000" : "https://edu-grade-ogf5.onrender.com";
}

let apiBase = localStorage.getItem(API_URL_KEY) || getDefaultApiBase();

const FIELDS = [
  "age", "studytime", "failures", "absences", "schoolsup", 
  "famsup", "paid", "activities", "internet", "higher", 
  "Medu", "Fedu", "First_Term", "Second_Term"
];

const DEFAULTS = {
  age: 17, studytime: 2, failures: 0, absences: 4, 
  schoolsup: 0, famsup: 1, paid: 0, activities: 0, 
  internet: 1, higher: 1, Medu: 2, Fedu: 2, 
  First_Term: 12, Second_Term: 12
};

// Built-in curated sample student profiles from the UCI Mathematics dataset
const SAMPLE_STUDENTS = [
  {
    sid: "S001",
    label: "Rahul Sharma",
    age: 18,
    studytime: 2,
    failures: 0,
    absences: 6,
    schoolsup: 1,
    famsup: 0,
    paid: 0,
    activities: 0,
    internet: 0,
    higher: 1,
    Medu: 4,
    Fedu: 4,
    First_Term: 5,
    Second_Term: 6
  },
  {
    sid: "S002",
    label: "Priya Verma",
    age: 17,
    studytime: 2,
    failures: 0,
    absences: 4,
    schoolsup: 0,
    famsup: 1,
    paid: 0,
    activities: 0,
    internet: 1,
    higher: 1,
    Medu: 1,
    Fedu: 1,
    First_Term: 8,
    Second_Term: 9
  },
  {
    sid: "S003",
    label: "Riya Sen",
    age: 15,
    studytime: 2,
    failures: 2,
    absences: 10,
    schoolsup: 1,
    famsup: 0,
    paid: 1,
    activities: 0,
    internet: 1,
    higher: 1,
    Medu: 1,
    Fedu: 1,
    First_Term: 11,
    Second_Term: 11
  },
  {
    sid: "S004",
    label: "Aman Patel",
    age: 15,
    studytime: 3,
    failures: 0,
    absences: 2,
    schoolsup: 0,
    famsup: 1,
    paid: 1,
    activities: 1,
    internet: 1,
    higher: 1,
    Medu: 4,
    Fedu: 2,
    First_Term: 15,
    Second_Term: 14
  },
  {
    sid: "S005",
    label: "Kavita Rao",
    age: 16,
    studytime: 4,
    failures: 0,
    absences: 1,
    schoolsup: 0,
    famsup: 1,
    paid: 0,
    activities: 1,
    internet: 1,
    higher: 1,
    Medu: 4,
    Fedu: 4,
    First_Term: 18,
    Second_Term: 19
  }
];

const $ = id => document.getElementById(id);

let students = [];
try {
  students = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
} catch (e) {
  students = [];
}

// Auto-populate if empty for smooth initial experience
if (students.length === 0) {
  students = JSON.parse(JSON.stringify(SAMPLE_STUDENTS));
  localStorage.setItem(STORE_KEY, JSON.stringify(students));
}

let editIndex = -1;
let isApiConnected = false;

// Header setup
$("teacherName").textContent = sessionStorage.getItem("edugrade_auth") || "Educator";
$("heroSub").textContent = "Student Academic Performance & At-Risk Intervention System | " + SUBJECT;
$("activeSubjectBadge").textContent = SUBJECT + " Cohort";

$("logoutBtn").onclick = () => {
  sessionStorage.removeItem("edugrade_auth");
  sessionStorage.removeItem("edugrade_subject");
  location.replace("login.html");
};

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(students));
}

function selectedIndex() {
  const v = $("studentSelect").value;
  return v === "" ? -1 : +v;
}

function pill(type, text) {
  return '<span class="pill pill-' + type + '">' + text + '</span>';
}

/* ---- Rule-based fallback calculation (Explainable Risk Rule) ---- */
function ruleGradeBand(avg) {
  if (avg >= 17) return "Excellent";
  if (avg >= 14) return "Good";
  if (avg >= 10) return "Average";
  return "Low";
}

function ruleRiskEvaluation(s) {
  const avg = (s.First_Term + s.Second_Term) / 2.0;
  const reasons = [];

  if (avg < 10) reasons.push("Average marks (" + avg.toFixed(1) + "/20) are below passing grade 10");
  if (s.failures >= 2) reasons.push("Student has " + s.failures + " past course failures");

  if (reasons.length > 0) {
    return {
      level: "High",
      reasons: reasons,
      recommendation: "Immediate remedial tutoring and parental consultation recommended."
    };
  }

  const medReasons = [];
  if (avg < 14) medReasons.push("Average marks (" + avg.toFixed(1) + "/20) are below targeted Good band 14");
  if (s.absences > 15) medReasons.push("High absenteeism with " + s.absences + " missed classes");

  if (medReasons.length > 0) {
    return {
      level: "Medium",
      reasons: medReasons,
      recommendation: "Targeted coursework review and attendance check-ins recommended."
    };
  }

  return {
    level: "Low",
    reasons: ["Performance and attendance metrics align with satisfactory thresholds"],
    recommendation: "Maintain current learning plan and continue positive reinforcement."
  };
}

/* ---- API Health & Status Checking ---- */
async function checkApiHealth() {
  const dot = $("apiStatusDot");
  const text = $("apiStatusText");
  dot.className = "status-dot checking";
  text.textContent = "Connecting...";

  if (!apiBase) {
    dot.className = "status-dot offline";
    text.textContent = "Configure Backend URL";
    isApiConnected = false;
    return;
  }

  try {
    const cleanBase = apiBase.replace(/\/+$/, "");
    const res = await fetch(cleanBase + "/health", { method: "GET" });
    if (res.ok) {
      const data = await res.json();
      dot.className = "status-dot online";
      text.textContent = "API Connected";
      isApiConnected = true;
      $("metricEngineSub").textContent = "FastAPI Service (Online)";
    } else {
      throw new Error("HTTP " + res.status);
    }
  } catch (err) {
    dot.className = "status-dot offline";
    text.textContent = "API Offline";
    isApiConnected = false;
    $("metricEngineSub").textContent = "Local Rule Engine (Fallback)";
  }
}

/* ---- Render Overview & Selected Student ---- */
function render() {
  $("totalStudents").textContent = students.length;

  const sel = $("studentSelect");
  const currentVal = sel.value;
  sel.innerHTML = '<option value="">Select a student...</option>' +
    students.map((s, i) => '<option value="' + i + '">' + s.sid + ' - ' + s.label + '</option>').join("");

  if (currentVal !== "" && students[+currentVal]) {
    sel.value = currentVal;
  } else if (students.length > 0) {
    sel.value = "0"; // default to first student for instant view
  }
  showSelected();
}

function setMetrics(pred) {
  if (pred) {
    $("metricGrade").textContent = pred.grade_band;
    $("metricRisk").textContent = pred.risk;

    const gClass = pred.grade_band === "Excellent" ? "pill-low" :
                   pred.grade_band === "Good" ? "pill-info" :
                   pred.grade_band === "Average" ? "pill-medium" : "pill-high";
    
    $("metricGrade").innerHTML = '<span class="pill ' + gClass + '" style="font-size:20px;padding:4px 16px;">' + pred.grade_band + '</span>';

    const rClass = pred.risk === "High" ? "pill-high" :
                   pred.risk === "Medium" ? "pill-medium" : "pill-low";
    $("metricRisk").innerHTML = '<span class="pill ' + rClass + '" style="font-size:20px;padding:4px 16px;">' + pred.risk + '</span>';
  } else {
    $("metricGrade").textContent = "Awaiting";
    $("metricRisk").textContent = "Awaiting";
  }

  document.querySelectorAll(".risk-card").forEach(c => c.classList.remove("active"));
  if (pred && $("rc-" + pred.risk)) {
    $("rc-" + pred.risk).classList.add("active");
  }
}

function showRecent(s) {
  const container = $("recent");
  if (!s) {
    container.innerHTML = '<span class="muted">Select a student and click <b>Run Prediction</b>.</span>';
    return;
  }

  if (!s.pred) {
    container.innerHTML = '<span class="muted">No prediction yet for <b>' + s.sid + ' - ' + s.label + '</b>. Click <b>Run Prediction</b> in the toolbar above.</span>';
    return;
  }

  const p = s.pred;
  const isModel = p.source === "model";
  const sourceBadge = isModel
    ? '<span class="pill pill-info"><svg class="ic" style="width:14px;height:14px;"><use href="#i-bolt"/></svg> Linear SVC ML Pipeline</span>'
    : '<span class="pill pill-medium">Rule-based Fallback</span>';

  let factorsHtml = "";
  if (p.risk_factors && p.risk_factors.length > 0) {
    factorsHtml = '<ul class="risk-factors-list">' +
      p.risk_factors.map(f => '<li>' + f + '</li>').join("") +
      '</ul>';
  }

  container.innerHTML =
    '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">' +
      '<div><h4 style="font-size:18px; font-weight:700;">' + s.sid + ' - ' + s.label + '</h4><span class="muted" style="font-size:13px;">Subject: ' + SUBJECT + '</span></div>' +
      '<div>' + sourceBadge + '</div>' +
    '</div>' +
    '<div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap; margin:14px 0;">' +
      '<div><span class="muted" style="font-size:12px; display:block;">Predicted Final Band</span>' + pill("grade", p.grade_band) + '</div>' +
      '<div><span class="muted" style="font-size:12px; display:block;">Academic Risk Level</span>' + pill(String(p.risk).toLowerCase(), p.risk) + '</div>' +
      '<div><span class="muted" style="font-size:12px; display:block;">Prediction Time</span><span style="font-size:13px; color:var(--muted);">' + (p.timestamp || "Just now") + '</span></div>' +
    '</div>' +
    '<div class="rec-card">' +
      '<div class="rec-title"><svg class="ic"><use href="#i-alert"/></svg> Identified Risk Factors &amp; Decision Drivers:</div>' +
      factorsHtml +
      '<div class="rec-title" style="margin-top:10px; color:#86EFAC;"><svg class="ic"><use href="#i-check"/></svg> Recommended Intervention Strategy:</div>' +
      '<p style="font-size:14px; color:#F4F4F8; margin-top:4px;">' + (p.recommendation || "Maintain standard monitoring.") + '</p>' +
    '</div>' +
    '<p class="note"><b>Note:</b> Decision-support signal only. Mandatory teacher review required before implementing formal interventions.</p>';
}

function showSelected() {
  const i = selectedIndex();
  if (i < 0) {
    $("chartMsg").classList.remove("hidden");
    $("perfBox").classList.add("hidden");
    setMetrics(null);
    showRecent(null);
    return;
  }

  const s = students[i];
  // Ensure First_Term & Second_Term exist (backwards compatibility if loaded as G1/G2)
  if (s.First_Term === undefined && s.G1 !== undefined) s.First_Term = s.G1;
  if (s.Second_Term === undefined && s.G2 !== undefined) s.Second_Term = s.G2;

  $("chartMsg").classList.add("hidden");
  $("perfBox").classList.remove("hidden");

  $("perfName").textContent = s.label;
  $("perfId").textContent = "Student ID: " + s.sid + " | Age: " + s.age + " yrs | Higher Ed: " + (s.higher ? "Yes" : "No");

  const diff = s.Second_Term - s.First_Term;
  const t = $("perfTrend");
  if (diff > 0) {
    t.className = "trend trend-up";
    t.textContent = "▲ Improved by +" + diff + " marks";
  } else if (diff < 0) {
    t.className = "trend trend-down";
    t.textContent = "▼ Dropped by -" + Math.abs(diff) + " marks";
  } else {
    t.className = "trend trend-same";
    t.textContent = "◆ Consistent (" + s.First_Term + "/20)";
  }

  const avg = ((s.First_Term + s.Second_Term) / 2.0).toFixed(1);
  const studyHoursText = ["<2h", "2-5h", "5-10h", ">10h"][s.studytime - 1] || s.studytime;

  $("statRow").innerHTML =
    '<div class="stat"><span>Average Term Grade</span><b>' + avg + ' / 20</b></div>' +
    '<div class="stat"><span>Class Absences</span><b>' + s.absences + '</b></div>' +
    '<div class="stat"><span>Past Failures</span><b>' + s.failures + '</b></div>' +
    '<div class="stat"><span>Study Habit Band</span><b>' + s.studytime + ' (' + studyHoursText + ')</b></div>';

  renderCharts(s);
  setMetrics(s.pred || null);
  showRecent(s);
}

function renderCharts(s) {
  // Chart 1: Grade Progression vs Passing and Target Benchmarks
  Plotly.newPlot("chartGrades", [
    {
      x: ["First Term", "Second Term", "Pass Benchmark", "Good Band Target"],
      y: [s.First_Term, s.Second_Term, 10, 14],
      type: "bar",
      text: [s.First_Term, s.Second_Term, 10, 14],
      textposition: "outside",
      marker: {
        color: [
          s.First_Term < 10 ? "#EF4444" : "#A78BFA",
          s.Second_Term < 10 ? "#EF4444" : "#8B5CF6",
          "rgba(255, 255, 255, 0.2)",
          "rgba(139, 92, 246, 0.3)"
        ]
      },
      width: [0.4, 0.4, 0.3, 0.3]
    }
  ], {
    height: 280,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#D4D4DC", size: 12 },
    margin: { t: 20, r: 10, b: 40, l: 36 },
    yaxis: { range: [0, 22], gridcolor: "#262634", title: "Marks (0–20)" },
    xaxis: { gridcolor: "#262634" }
  }, { displayModeBar: false, responsive: true });

  // Chart 2: Academic & Behavioral Risk Factor Comparison (Student vs Cohort Benchmark)
  // Scale each to 0-100% for an intuitive multi-factor horizontal bar chart
  const studentMetrics = [
    (s.studytime / 4) * 100,
    Math.min(100, (s.absences / 20) * 100),
    Math.min(100, (s.failures / 3) * 100),
    ((s.Medu + s.Fedu) / 8) * 100
  ];

  Plotly.newPlot("chartFactors", [
    {
      x: ["Study Habits", "Absenteeism Impact", "Past Failures", "Support Index"],
      y: studentMetrics,
      name: "Selected Student",
      type: "bar",
      marker: { color: "#8B5CF6" },
      width: 0.35
    },
    {
      x: ["Study Habits", "Absenteeism Impact", "Past Failures", "Support Index"],
      y: [50, 20, 0, 50], // Standard cohort reference baseline
      name: "Healthy Baseline",
      type: "bar",
      marker: { color: "#4B5563" },
      width: 0.35
    }
  ], {
    barmode: "group",
    height: 280,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#D4D4DC", size: 12 },
    margin: { t: 20, r: 10, b: 40, l: 36 },
    yaxis: { range: [0, 115], gridcolor: "#262634", title: "Index Rating (%)" },
    xaxis: { gridcolor: "#262634" },
    legend: { orientation: "h", y: 1.15, x: 0.2 }
  }, { displayModeBar: false, responsive: true });
}

$("studentSelect").onchange = showSelected;

/* ---- Student Form (Add / Edit) ---- */
function openForm(i) {
  editIndex = i;
  const s = i >= 0 ? students[i] : null;
  $("formTitle").textContent = s ? "Edit Student Record" : "Add Student Information";
  $("sid").value = s ? s.sid : "S00" + (students.length + 1);
  $("label").value = s ? s.label : "";

  FIELDS.forEach(f => {
    if ($(f)) {
      $(f).value = s && s[f] !== undefined ? s[f] : DEFAULTS[f];
    }
  });

  $("modal").classList.remove("hidden");
}

function closeForm() {
  $("modal").classList.add("hidden");
}

$("addBtn").onclick = () => openForm(-1);
$("cancelBtn").onclick = closeForm;
$("closeFormX").onclick = closeForm;

$("editBtn").onclick = () => {
  const i = selectedIndex();
  if (i < 0) return alert("Please select a student from the dropdown first.");
  openForm(i);
};

$("deleteBtn").onclick = () => {
  const i = selectedIndex();
  if (i < 0) return alert("Please select a student from the dropdown first.");
  if (!confirm("Are you sure you want to remove " + students[i].sid + " - " + students[i].label + "?")) return;
  students.splice(i, 1);
  save();
  render();
};

$("studentForm").onsubmit = e => {
  e.preventDefault();
  const sid = $("sid").value.trim().toUpperCase();
  const label = $("label").value.trim();

  if (students.some((s, idx) => s.sid.toUpperCase() === sid && idx !== editIndex)) {
    return alert("A student with ID '" + sid + "' already exists in this cohort.");
  }

  const data = { sid, label, subject: SUBJECT };
  FIELDS.forEach(f => {
    if ($(f)) {
      data[f] = +$(f).value;
    }
  });

  let targetIdx;
  if (editIndex >= 0) {
    data.pred = null; // Clear old prediction when inputs change
    students[editIndex] = data;
    targetIdx = editIndex;
  } else {
    students.push(data);
    targetIdx = students.length - 1;
  }

  save();
  closeForm();
  render();
  $("studentSelect").value = String(targetIdx);
  showSelected();
};

/* ---- Load UCI Mathematics Sample Students ---- */
$("loadSamplesBtn").onclick = async () => {
  // If API is connected, fetch fresh from backend
  if (isApiConnected && apiBase) {
    try {
      const cleanBase = apiBase.replace(/\/+$/, "");
      const res = await fetch(cleanBase + "/sample-students");
      if (res.ok) {
        const remoteSamples = await res.json();
        if (Array.isArray(remoteSamples) && remoteSamples.length > 0) {
          students = remoteSamples;
          save();
          render();
          return;
        }
      }
    } catch (e) {
      console.warn("Backend sample-students unavailable, using local samples.", e);
    }
  }

  // Fallback to embedded dataset samples
  students = JSON.parse(JSON.stringify(SAMPLE_STUDENTS));
  save();
  render();
};

/* ---- Predict Action ---- */
async function callApiPredict(s) {
  const cleanBase = apiBase.replace(/\/+$/, "");
  const payload = {
    studytime: Number(s.studytime),
    absences: Number(s.absences),
    failures: Number(s.failures),
    age: Number(s.age),
    schoolsup: Number(s.schoolsup),
    famsup: Number(s.famsup),
    paid: Number(s.paid),
    activities: Number(s.activities),
    internet: Number(s.internet),
    higher: Number(s.higher),
    Medu: Number(s.Medu),
    Fedu: Number(s.Fedu),
    First_Term: Number(s.First_Term !== undefined ? s.First_Term : s.G1),
    Second_Term: Number(s.Second_Term !== undefined ? s.Second_Term : s.G2)
  };

  const res = await fetch(cleanBase + "/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error("API returned status " + res.status + ": " + errText);
  }

  return await res.json();
}

$("predictBtn").onclick = async () => {
  const i = selectedIndex();
  if (i < 0) return alert("Please select a student from the dropdown first.");
  const s = students[i];

  $("recent").innerHTML = '<div style="padding:14px; text-align:center;"><span class="muted">Running Machine Learning Inference &amp; Risk Evaluation...</span></div>';

  try {
    const result = await callApiPredict(s);
    const band = result.predicted_grade_band || result.grade_band;
    const rLevel = result.risk_level || result.risk;
    const reasons = result.risk_factors || [];
    const rec = result.recommendation || "";

    s.pred = {
      grade_band: band,
      risk: rLevel,
      risk_factors: reasons,
      recommendation: rec,
      source: "model",
      timestamp: new Date().toLocaleTimeString()
    };
  } catch (err) {
    console.warn("API prediction request failed, utilizing explainable rule engine:", err);
    const avg = (s.First_Term + s.Second_Term) / 2.0;
    const band = ruleGradeBand(avg);
    const riskEval = ruleRiskEvaluation(s);

    s.pred = {
      grade_band: band,
      risk: riskEval.level,
      risk_factors: riskEval.reasons,
      recommendation: riskEval.recommendation,
      source: "fallback",
      timestamp: new Date().toLocaleTimeString()
    };
  }

  save();
  setMetrics(s.pred);
  showRecent(s);
};

/* ---- API Settings Modal ---- */
function openApiModal() {
  $("apiUrlInput").value = apiBase;
  $("apiTestResult").classList.add("hidden");
  $("apiModal").classList.remove("hidden");
}

function closeApiModal() {
  $("apiModal").classList.add("hidden");
}

$("apiStatusBtn").onclick = openApiModal;
$("closeApiModalX").onclick = closeApiModal;

$("testApiBtn").onclick = async () => {
  const testUrl = $("apiUrlInput").value.trim().replace(/\/+$/, "");
  const resDiv = $("apiTestResult");
  resDiv.className = "";
  resDiv.classList.remove("hidden");
  resDiv.innerHTML = '<span class="muted">Pinging ' + testUrl + '/health ...</span>';

  const start = performance.now();
  try {
    const r = await fetch(testUrl + "/health");
    const dur = Math.round(performance.now() - start);
    if (r.ok) {
      const data = await r.json();
      resDiv.style.background = "rgba(16,185,129,0.15)";
      resDiv.style.border = "1px solid #10B981";
      resDiv.style.color = "#86EFAC";
      resDiv.innerHTML = '<b>Connection Successful!</b> Latency: ' + dur + 'ms<br>Model loaded: ' + data.model_loaded;
    } else {
      throw new Error("HTTP " + r.status);
    }
  } catch (e) {
    resDiv.style.background = "rgba(239,68,68,0.15)";
    resDiv.style.border = "1px solid #EF4444";
    resDiv.style.color = "#FCA5A5";
    resDiv.innerHTML = '<b>Connection Failed:</b> ' + e.message + '<br><small>Ensure backend is active on Render/Localhost and CORS is allowed.</small>';
  }
};

$("saveApiBtn").onclick = () => {
  const newUrl = $("apiUrlInput").value.trim();
  apiBase = newUrl;
  localStorage.setItem(API_URL_KEY, newUrl);
  closeApiModal();
  checkApiHealth();
};

/* ---- Model Performance Modal ---- */
$("openModelModalBtn").onclick = () => $("modelModal").classList.remove("hidden");
$("closeModelModalX").onclick = () => $("modelModal").classList.add("hidden");
$("closeModelModalBtn").onclick = () => $("modelModal").classList.add("hidden");

// Initialize
render();
checkApiHealth();
