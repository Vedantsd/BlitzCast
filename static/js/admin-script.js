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

const currentUserId = Number(document.body.dataset.currentUserId);
const usersBody = document.getElementById("users-body");
const userCountBadge = document.getElementById("user-count-badge");

function formatDate(value) {
  if (!value) return "Never";
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function renderUsers(users) {
  userCountBadge.textContent = `${users.length} account${users.length === 1 ? "" : "s"}`;
  usersBody.innerHTML = "";

  users.forEach((user) => {
    const isSelf = user.id === currentUserId;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <div class="name-cell">
          ${user.name}
          ${isSelf ? '<span class="you-badge">You</span>' : ""}
        </div>
      </td>
      <td>${user.email}</td>
      <td><span class="role-badge role-${user.role}">${user.role}</span></td>
      <td><span class="status-badge status-${user.is_active ? "active" : "disabled"}">${user.is_active ? "Active" : "Disabled"}</span></td>
      <td>${formatDate(user.last_login_at)}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn toggle-active-btn" data-id="${user.id}" data-active="${user.is_active}" ${isSelf && user.is_active ? "disabled" : ""} title="${user.is_active ? "Disable account" : "Enable account"}">
            ${user.is_active
              ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>'
              : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'}
          </button>
          <button class="icon-btn danger delete-btn" data-id="${user.id}" ${isSelf ? "disabled" : ""} title="Delete account">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    `;
    usersBody.appendChild(row);
  });
}

async function loadUsers() {
  const response = await fetch("/api/admin/users");
  if (!response.ok) return;
  const users = await response.json();
  renderUsers(users);
}

usersBody.addEventListener("click", async (event) => {
  const toggleBtn = event.target.closest(".toggle-active-btn");
  const deleteBtn = event.target.closest(".delete-btn");

  if (toggleBtn && !toggleBtn.disabled) {
    const id = toggleBtn.dataset.id;
    const isActive = toggleBtn.dataset.active === "true";
    toggleBtn.disabled = true;
    await fetch(`/api/admin/users/${id}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !isActive }),
    });
    await loadUsers();
  }

  if (deleteBtn && !deleteBtn.disabled) {
    if (!deleteBtn.classList.contains("confirming")) {
      deleteBtn.classList.add("confirming");
      deleteBtn.title = "Click again to confirm";
      setTimeout(() => {
        deleteBtn.classList.remove("confirming");
        deleteBtn.title = "Delete account";
      }, 3000);
      return;
    }
    deleteBtn.disabled = true;
    await fetch(`/api/admin/users/${deleteBtn.dataset.id}`, { method: "DELETE" });
    await loadUsers();
  }
});

const generateBtn = document.getElementById("generate-password");
const passwordInput = document.getElementById("new-password");

function generatePassword(length = 14) {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => charset[v % charset.length]).join("");
}

if (generateBtn) {
  generateBtn.addEventListener("click", () => {
    passwordInput.value = generatePassword();
  });
}

const form = document.getElementById("add-user-form");
const submitButton = document.getElementById("add-user-submit");
const banner = document.getElementById("add-user-banner");
const nameInput = document.getElementById("new-name");
const nameField = nameInput.closest(".admin-field");
const nameError = document.getElementById("new-name-error");
const emailInput = document.getElementById("new-email");
const emailField = emailInput.closest(".admin-field");
const emailError = document.getElementById("new-email-error");
const passwordField = passwordInput.closest(".admin-field");
const passwordError = document.getElementById("new-password-error");
const roleSelect = document.getElementById("new-role");
const credentialBox = document.getElementById("credential-box");
const credentialEmail = document.getElementById("credential-email");
const credentialPassword = document.getElementById("credential-password");
const copyButton = document.getElementById("copy-credentials");

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

function showBanner(message, isError = true) {
  banner.textContent = message;
  banner.classList.toggle("visible", Boolean(message));
  banner.style.color = isError ? "" : "var(--good)";
  banner.style.background = isError ? "" : "var(--good-bg)";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showBanner("");
  credentialBox.hidden = true;

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const role = roleSelect.value;

  const nameValid = name.length > 0;
  const emailValid = EMAIL_PATTERN.test(email);
  const passwordValid = password.length >= 8;

  setFieldError(nameField, nameError, nameValid ? "" : "Enter a name.");
  setFieldError(emailField, emailError, emailValid ? "" : "Enter a valid email address.");
  setFieldError(passwordField, passwordError, passwordValid ? "" : "Password must be at least 8 characters.");

  if (!nameValid || !emailValid || !passwordValid) {
    showBanner("Please fix the highlighted fields to continue.");
    return;
  }

  submitButton.classList.add("is-loading");
  submitButton.disabled = true;

  try {
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await response.json();

    if (response.ok && data.success) {
      showBanner(`${name} was added as ${role}.`, false);
      credentialEmail.textContent = email;
      credentialPassword.textContent = password;
      credentialBox.hidden = false;
      form.reset();
      roleSelect.value = "analyst";
      await loadUsers();
    } else {
      showBanner(data.error || "Could not create the account.");
    }
  } catch {
    showBanner("Something went wrong. Please try again.");
  } finally {
    submitButton.classList.remove("is-loading");
    submitButton.disabled = false;
  }
});

if (copyButton) {
  copyButton.addEventListener("click", async () => {
    const text = `Email: ${credentialEmail.textContent}\nPassword: ${credentialPassword.textContent}`;
    try {
      await navigator.clipboard.writeText(text);
      copyButton.textContent = "Copied";
      setTimeout(() => {
        copyButton.textContent = "Copy to clipboard";
      }, 1800);
    } catch {}
  });
}

loadUsers();