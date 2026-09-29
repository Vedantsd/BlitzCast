const themeToggle = document.getElementById("theme-toggle");

function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("blitzcast-theme", theme);
  } catch {}
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    setTheme(currentTheme() === "dark" ? "light" : "dark");
  });
}

const passwordInput = document.getElementById("password");
const toggleVisibility = document.getElementById("toggle-password");

if (toggleVisibility && passwordInput) {
  toggleVisibility.addEventListener("click", () => {
    const isVisible = passwordInput.type === "text";
    passwordInput.type = isVisible ? "password" : "text";
    toggleVisibility.classList.toggle("is-visible", !isVisible);
    toggleVisibility.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
  });
}

const form = document.getElementById("login-form");
const submitButton = document.getElementById("auth-submit");
const banner = document.getElementById("auth-banner");
const emailInput = document.getElementById("email");
const emailField = emailInput.closest(".auth-field");
const emailError = document.getElementById("email-error");
const passwordField = passwordInput.closest(".auth-field");
const passwordError = document.getElementById("password-error");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setFieldError(field, errorEl, message) {
  if (message) {
    field.classList.add("has-error");
    errorEl.textContent = message;
  } else {
    field.classList.remove("has-error");
    errorEl.textContent = "";
  }
}

function showBanner(message) {
  banner.textContent = message;
  banner.classList.toggle("visible", Boolean(message));
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  showBanner("");

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  const emailValid = EMAIL_PATTERN.test(email);
  const passwordValid = password.length >= 6;

  setFieldError(emailField, emailError, emailValid ? "" : "Enter a valid email address.");
  setFieldError(passwordField, passwordError, passwordValid ? "" : "Password must be at least 6 characters.");

  if (!emailValid || !passwordValid) {
    showBanner("Please fix the highlighted fields to continue.");
    return;
  }

  submitButton.classList.add("is-loading");
  submitButton.disabled = true;

  setTimeout(() => {
    window.location.href = "/dashboard";
  }, 900);
});