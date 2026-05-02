(function () {
  function initTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.body.classList.add("dark-mode");
      updateThemeIcon("dark");
    } else {
      document.body.classList.remove("dark-mode");
      updateThemeIcon("light");
    }
  }

  // Toggle between light and dark mode
  function toggleTheme() {
    if (document.body.classList.contains("dark-mode")) {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("theme", "light");
      updateThemeIcon("light");
      showNotification("🌞 Light mode activated", "info");
    } else {
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
      updateThemeIcon("dark");
      showNotification("🌙 Dark mode activated", "info");
    }
  }

  // Update the theme toggle button icon
  function updateThemeIcon(mode) {
    const toggleBtn = document.getElementById("themeToggle");
    if (toggleBtn) {
      toggleBtn.innerHTML = mode === "dark" ? "☀️ Light" : "🌙 Dark";
      toggleBtn.title =
        mode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode";
    }
  }

  // Show notification
  function showNotification(message, type) {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === "success" ? "#2ecc71" : "#3498db"};
            color: white;
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  }

  // Add theme toggle button to user menu
  function addThemeToggleButton() {
    const userMenu = document.querySelector(".user-menu");
    if (userMenu && !document.getElementById("themeToggle")) {
      const toggleBtn = document.createElement("button");
      toggleBtn.id = "themeToggle";
      toggleBtn.className = "theme-toggle";
      toggleBtn.onclick = toggleTheme;
      userMenu.insertBefore(toggleBtn, userMenu.firstChild);

      const currentMode = document.body.classList.contains("dark-mode")
        ? "dark"
        : "light";
      updateThemeIcon(currentMode);
    }
  }

  // Export to global
  window.toggleTheme = toggleTheme;
  window.initTheme = initTheme;

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initTheme();
      addThemeToggleButton();
    });
  } else {
    initTheme();
    addThemeToggleButton();
  }
})();
