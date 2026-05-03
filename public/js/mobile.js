
function initMobileMenu() {
  
  if (!document.querySelector(".sidebar-overlay")) {
    const overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function () {
      closeSidebar();
    });
  }

  
  let menuToggle = document.querySelector(".menu-toggle");
  if (!menuToggle) {
    
    const topBar = document.querySelector(".top-bar");
    if (topBar && window.innerWidth <= 768) {
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "menu-toggle";
      toggleBtn.innerHTML = '<i class="bx bx-menu"></i>';
      toggleBtn.style.cssText = `
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                display: flex;
                align-items: center;
                color: var(--text-color);
                margin-right: 10px;
            `;
      toggleBtn.onclick = toggleSidebar;
      topBar.insertBefore(toggleBtn, topBar.firstChild);
      menuToggle = toggleBtn;
    }
  }
}

function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.querySelector(".sidebar-overlay");

  if (sidebar) {
    sidebar.classList.toggle("open");
  }
  if (overlay) {
    overlay.classList.toggle("active");
  }

  
  if (sidebar.classList.contains("open")) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }
}

function closeSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.querySelector(".sidebar-overlay");

  if (sidebar) {
    sidebar.classList.remove("open");
  }
  if (overlay) {
    overlay.classList.remove("active");
  }
  document.body.style.overflow = "";
}


window.addEventListener("resize", function () {
  if (window.innerWidth > 768) {
    closeSidebar();
    const menuToggle = document.querySelector(".menu-toggle");
    if (menuToggle) {
      menuToggle.style.display = "none";
    }
  } else {
    const menuToggle = document.querySelector(".menu-toggle");
    if (menuToggle && menuToggle.style.display !== "none") {
      menuToggle.style.display = "flex";
    }
  }
});


document.addEventListener("DOMContentLoaded", initMobileMenu);
