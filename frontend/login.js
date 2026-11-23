const $ = (id) => document.getElementById(id);
const KEY = "edugrade_teachers_v2";
let mode = "login";

// Auto redirect if already authenticated
if (sessionStorage.getItem("edugrade_auth") && sessionStorage.getItem("edugrade_subject")) {
  location.replace("index.html");
}

function getTeachers() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "{}");
    return data;
  } catch (e) {
    return {};
  }
}

async function hash(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function showError(msg) {
  $("loginError").textContent = msg;
  $("loginError").classList.remove("hidden");
}

function setMode(m) {
  mode = m;
  const reg = m === "register";
  $("modeTitle").textContent = reg ? "Create Teacher Account" : "Teacher Login";
  $("submitBtn").textContent = reg ? "Register" : "Login";
  $("switchText").textContent = reg ? "Already registered?" : "New teacher?";
  $("switchLink").textContent = reg ? "Login" : "Register";
  $("confirmWrap").classList.toggle("hidden", !reg);
  $("subjectWrap").classList.toggle("hidden", !reg);
  $("confirm").required = reg;
  $("subject").required = reg;
  $("loginError").classList.add("hidden");
}

$("switchLink").addEventListener("click", (e) => {
  e.preventDefault();
  setMode(mode === "login" ? "register" : "login");
});

$("togglePw").addEventListener("click", () => {
  const pw = $("password");
  pw.type = pw.type === "password" ? "text" : "password";
});

// Quick Demo Login Button for instant access
$("quickDemoBtn").addEventListener("click", () => {
  sessionStorage.setItem("edugrade_auth", "Prof. Nitish Kr. Sarma");
  sessionStorage.setItem("edugrade_subject", "Mathematics");
  location.replace("index.html");
});

async function registerTeacher(username, password, subject) {
  const teachers = getTeachers();
  if (teachers[username]) throw new Error("Username already exists.");
  teachers[username] = { hash: await hash(password), subject };
  localStorage.setItem(KEY, JSON.stringify(teachers));
  return subject;
}

async function loginTeacher(username, password) {
  const teachers = getTeachers();
  // Allow default teacher credentials out of the box if database is empty
  if (Object.keys(teachers).length === 0 && (username === "teacher" || username === "admin" || username === "reena")) {
    return "Mathematics";
  }
  const t = teachers[username];
  if (!t || t.hash !== await hash(password)) {
    // If not found in hash table, check if default login
    if ((username === "teacher" || username === "reena") && password === "password123") {
      return "Mathematics";
    }
    throw new Error("Invalid username or password. You can also click 'Quick Demo Login'.");
  }
  return t.subject;
}

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const u = $("username").value.trim().toLowerCase();
  const p = $("password").value;
  let subject;

  try {
    if (mode === "register") {
      if (p !== $("confirm").value) throw new Error("Passwords do not match.");
      if (!$("subject").value) throw new Error("Please select your subject.");
      subject = await registerTeacher(u, p, $("subject").value);
    } else {
      subject = await loginTeacher(u, p);
    }
    sessionStorage.setItem("edugrade_auth", u.charAt(0).toUpperCase() + u.slice(1));
    sessionStorage.setItem("edugrade_subject", subject);
    location.replace("index.html");
  } catch (err) {
    showError(err.message);
  }
});
