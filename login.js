/* =============================================================
   login.js — Authentication
   ============================================================= */

const ALLOWED_EMAILS   = [];      // empty = any @gmail.com allowed
const CORRECT_PASSWORD = "ADMIN"; // change this to your preferred password

// Redirect if already logged in
if (sessionStorage.getItem("att_auth") === "true") {
  window.location.replace("dashboard.html");
}

document.addEventListener("DOMContentLoaded", () => {

  const form     = document.getElementById("loginForm");
  const emailEl  = document.getElementById("email");
  const passEl   = document.getElementById("password");
  const errorEl  = document.getElementById("errorMsg");
  const signinBtn = document.getElementById("signinBtn");
  const btnLabel  = document.getElementById("btnLabel");
  const btnSpin   = document.getElementById("btnSpin");
  const eyeBtn    = document.getElementById("eyeBtn");

  // Toggle password visibility
  eyeBtn.addEventListener("click", () => {
    const isText = passEl.type === "text";
    passEl.type = isText ? "password" : "text";
    document.getElementById("eyeIcon").innerHTML = isText
      ? `<path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="10" cy="10" r="2.5"/>`
      : `<path d="M13.73 13.73A7 7 0 0 1 3 10s2.7-5 7-5c1.3 0 2.5.38 3.5 1M17.5 13.5A9 9 0 0 0 19 10s-3.5-7-9-7c-.5 0-1 .04-1.5.12"/><line x1="2" y1="2" x2="18" y2="18"/>`;
  });

  // Submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearError();

    const email = emailEl.value.trim().toLowerCase();
    const pass  = passEl.value;

    // Gmail check
    if (!email.endsWith("@gmail.com")) {
      showError("Please enter a valid Gmail address (must end in @gmail.com).");
      emailEl.focus(); return;
    }

    // Allowlist check (optional)
    if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.map(e => e.toLowerCase()).includes(email)) {
      showError("This Gmail address is not registered as a teacher account.");
      emailEl.focus(); return;
    }

    // Password check
    if (pass !== CORRECT_PASSWORD) {
      showError("Incorrect password. Please try again.");
      passEl.value = ""; passEl.focus(); return;
    }

    // Success
    setLoading(true);
    sessionStorage.setItem("att_auth", "true");
    sessionStorage.setItem("att_email", email);
    setTimeout(() => { window.location.href = "dashboard.html"; }, 550);
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.add("show");
  }

  function clearError() {
    errorEl.textContent = "";
    errorEl.classList.remove("show");
  }

  function setLoading(on) {
    signinBtn.disabled = on;
    btnLabel.textContent = on ? "Signing in…" : "Sign In";
    btnSpin.classList.toggle("show", on);
  }

});
