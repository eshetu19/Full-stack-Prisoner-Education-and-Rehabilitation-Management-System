const ROLE_PERMISSIONS = {
  admin: {
    name: "Administrator",
    icon: "<i class='bx bxs-shield-alt-2'   ></i>",
    canView: [
      "dashboard",
      "prisoners",
      "gallery",
      "programs",
      "enrollments",
      "sessions",
      "staff",
      "reports",
      "settings",
    ],
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canExport: true,
    menuItems: [
      {
        path: "/dashboard.html",
        icon: "<i class='bx bxs-dashboard'></i>",
        name: "Dashboard",
      },
      {
        path: "/prisoners.html",
        icon: "<i class='bx bxs-group'></i>",
        name: "Prisoners",
      },
      {
        path: "/gallery.html",
        icon: "<i class='bx bxs-image'></i>",
        name: "Gallery",
      },
      {
        path: "/programs.html",
        icon: "<i class='bx bxs-book'></i>",
        name: "Programs",
      },
      {
        path: "/enrollments.html",
        icon: "<i class='bx bxs-graduation'></i>",
        name: "Enrollments",
      },
      {
        path: "/sessions.html",
        icon: "<i class='bx bxs-calendar'></i>",
        name: "Sessions",
      },
      {
        path: "/staff.html",
        icon: "<i class='bx bxs-user-badge'></i>",
        name: "Staff",
      },
      {
        path: "/reports.html",
        icon: "<i class='bx bxs-report'></i>",
        name: "Reports",
      },
      {
        path: "/settings.html",
        icon: "<i class='bx bxs-cog'></i>",
        name: "Settings",
      },
    ],
  },
  instructor: {
    name: "Instructor",
    icon: "📚",
    canView: [
      "dashboard",
      "prisoners",
      "gallery",
      "programs",
      "enrollments",
      "sessions",
      "reports",
    ],
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canExport: true,
    menuItems: [
      {
        path: "/dashboard.html",
        icon: "<i class='bx bxs-dashboard'></i>",
        name: "Dashboard",
      },
      {
        path: "/prisoners.html",
        icon: "<i class='bx bxs-group'></i>",
        name: "My Prisoners",
      },
      {
        path: "/gallery.html",
        icon: "<i class='bx bxs-image'></i>",
        name: "Gallery",
      },
      {
        path: "/programs.html",
        icon: "<i class='bx bxs-book'></i>",
        name: "My Programs",
      },
      {
        path: "/enrollments.html",
        icon: "<i class='bx bxs-graduation'></i>",
        name: "Enrollments",
      },
      {
        path: "/sessions.html",
        icon: "<i class='bx bxs-calendar'></i>",
        name: "My Sessions",
      },
      {
        path: "/reports.html",
        icon: "<i class='bx bxs-report'></i>",
        name: "Reports",
      },
    ],
  },
  viewer: {
    name: "Viewer",
    icon: "<i class='bx bxs-eye'></i>",
    canView: ["dashboard", "prisoners", "gallery", "programs", "reports"],
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canExport: true,
    menuItems: [
      {
        path: "/dashboard.html",
        icon: "<i class='bx bxs-dashboard'></i>",
        name: "Dashboard",
      },
      {
        path: "/prisoners.html",
        icon: "<i class='bx bxs-group'></i>",
        name: "View Prisoners",
      },
      {
        path: "/gallery.html",
        icon: "<i class='bx bxs-image'></i>",
        name: "Gallery",
      },
      {
        path: "/programs.html",
        icon: "<i class='bx bxs-book'></i>",
        name: "View Programs",
      },
      {
        path: "/reports.html",
        icon: "<i class='bx bxs-report'></i>",
        name: "Reports",
      },
    ],
  },
};


async function fetchUserRole() {
  try {
    const response = await fetch("/api/user-role");
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("userRole", data.role);
      localStorage.setItem("username", data.username);
      return data.role;
    }
  } catch (error) {
    console.error("Error fetching user role:", error);
  }
  return localStorage.getItem("userRole") || "viewer";
}


async function displayUserInfo() {
  const username = localStorage.getItem("username") || "User";
  let role = localStorage.getItem("userRole") || "viewer";

  
  if (!localStorage.getItem("userRole")) {
    role = await fetchUserRole();
  }

  const roleNames = {
    admin: "<i class='bx bxs-shield-alt-2'   ></i> Administrator",
    instructor: "<i class='bx bxs-graduation'></i> Instructor",
    viewer: "<i class='bx bxs-eye'></i> Viewer",
    staff: "<i class='bx bxs-user-badge'></i> Staff",
  };

  const userNameSpan = document.getElementById("userName");
  if (userNameSpan) {
    userNameSpan.innerHTML = `${username} <span style="font-size: 11px; color: var(--gray);">${roleNames[role] || role}</span>`;
  }
}


async function initRoleBasedNavigation() {
  const userRole = await fetchUserRole();
  const permissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.viewer;

  console.log("Role-based navigation initialized for:", userRole);

  
  const sidebarNav = document.querySelector(".sidebar-nav");
  if (sidebarNav) {
    sidebarNav.innerHTML = permissions.menuItems
      .map(
        (item) => `
            <a href="${item.path}" class="nav-item ${window.location.pathname === item.path ? "active" : ""}">
                <span class="nav-icon">${item.icon}</span> ${item.name}
            </a>
        `,
      )
      .join("");
  }

  
  if (userRole !== "admin") {
    const addProgramBtn = document.querySelector(
      '#programsGrid + button, .btn-primary[onclick*="openAddProgramModal"]',
    );
    if (addProgramBtn) {
      addProgramBtn.style.display = "none";
    }
  }

  return userRole;
}


function hasPermission(action) {
  const userRole = localStorage.getItem("userRole") || "viewer";
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions) return false;

  switch (action) {
    case "create":
      return permissions.canCreate;
    case "edit":
      return permissions.canEdit;
    case "delete":
      return permissions.canDelete;
    case "export":
      return permissions.canExport;
    default:
      return false;
  }
}


window.displayUserInfo = displayUserInfo;
window.initRoleBasedNavigation = initRoleBasedNavigation;
window.hasPermission = hasPermission;
window.fetchUserRole = fetchUserRole;
