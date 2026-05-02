let currentPage = 1;
let totalPages = 1;

async function loadPrisoners() {
  try {
    const params = {
      page: currentPage,
      limit: 10,
      search: document.getElementById("searchInput")?.value || "",
      block: document.getElementById("blockFilter")?.value || "all",
      status: document.getElementById("statusFilter")?.value || "all",
    };

    const query = new URLSearchParams(params).toString();
    const response = await fetch(`/api/prisoners${query ? "?" + query : ""}`);
    const data = await response.json();

    const tbody = document.getElementById("prisonersTable");

    if (!tbody) return;

    // Update stats cards
    document.getElementById("totalPrisoners").textContent = data.total || 0;
    document.getElementById("enrolledCount").textContent =
      data.stats?.enrolledCount || 0;
    document.getElementById("awaitingCount").textContent =
      data.stats?.awaitingCount || 0;
    document.getElementById("completionRate").textContent =
      (data.stats?.avgCompletion || 0) + "%";

    // Render prisoners table
    if (data.prisoners && data.prisoners.length > 0) {
      tbody.innerHTML = data.prisoners
        .map((prisoner) => {
          const avgCompletion = Math.round(prisoner.avg_completion_rate || 0);
          const programsCount = prisoner.programs_enrolled || 0;

          let programCell = "";
          if (programsCount > 0) {
            programCell = `
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            <span>${programsCount} program(s)</span>
                            <div style="width: 100px; height: 6px; background: #e1e8ed; border-radius: 3px; overflow: hidden;">
                                <div style="width: ${avgCompletion}%; height: 100%; background: var(--primary-color); border-radius: 3px;"></div>
                            </div>
                            <span style="font-size: 11px;">${avgCompletion}% avg</span>
                        </div>
                    `;
          } else {
            programCell = "None";
          }

          return `
                    <tr>
                        <td>${prisoner.name || "N/A"}</td>
                        <td>${prisoner.id_number || "N/A"}</td>
                        <td>${prisoner.gender || "N/A"}</td>
                        <td>${prisoner.age || "N/A"}</td>
                        <td>${prisoner.prison_block || "N/A"}</td>
                        <td>${getStatusBadge(prisoner.enrollment_status)}</td>
                        <td>${programCell}</td>
                        <td class="action-icons">
                            <button class="view-btn" onclick="viewPrisoner(${prisoner.id})">👁️</button>
                            <button class="edit-btn" onclick="editPrisoner(${prisoner.id})">✏️</button>
                            <button class="delete-btn" onclick="deletePrisoner(${prisoner.id})">🗑️</button>
                        </td>
                    </tr>
                `;
        })
        .join("");
    } else {
      tbody.innerHTML =
        '<tr><td colspan="8" style="text-align: center;">No prisoners found</td></tr>';
    }

    totalPages = data.totalPages || 1;
    updatePagination();
  } catch (error) {
    console.error("Error loading prisoners:", error);
    const tbody = document.getElementById("prisonersTable");
    if (tbody) {
      tbody.innerHTML =
        '<tr><td colspan="8" style="text-align: center; color: red;">Error loading prisoners</td></tr>';
    }
    showNotification("Failed to load prisoners", "error");
  }
}

function updatePagination() {
  const paginationDiv = document.getElementById("pagination");
  if (!paginationDiv) return;

  if (totalPages <= 1) {
    paginationDiv.innerHTML = "";
    return;
  }

  let html = "";
  html += `<button onclick="goToPage(1)" ${currentPage === 1 ? "disabled" : ""}>«</button>`;

  for (
    let i = Math.max(1, currentPage - 2);
    i <= Math.min(totalPages, currentPage + 2);
    i++
  ) {
    html += `<button class="${i === currentPage ? "active" : ""}" onclick="goToPage(${i})">${i}</button>`;
  }

  html += `<button onclick="goToPage(${totalPages})" ${currentPage === totalPages ? "disabled" : ""}>»</button>`;
  paginationDiv.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  loadPrisoners();
}

async function openAddPrisonerModal() {
  const modal = document.getElementById("addPrisonerModal");
  if (modal) {
    modal.style.display = "flex";
    const form = document.getElementById("addPrisonerForm");
    if (form) form.reset();
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
  }
}

// Handle Add Prisoner Form Submission
document
  .getElementById("addPrisonerForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      const response = await fetch("/api/prisoners", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (result.success) {
        showNotification(
          "Prisoner added successfully! ID: " + result.id_number,
        );
        closeModal("addPrisonerModal");
        e.target.reset();
        loadPrisoners();
      } else {
        showNotification(result.error || "Failed to add prisoner", "error");
      }
    } catch (error) {
      console.error("Error:", error);
      showNotification("Failed to add prisoner", "error");
    }
  });

async function deletePrisoner(id) {
  if (confirm("Are you sure you want to delete this prisoner?")) {
    try {
      const response = await fetch(`/api/prisoners/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        showNotification("Prisoner deleted successfully");
        loadPrisoners();
      } else {
        showNotification(result.error || "Failed to delete", "error");
      }
    } catch (error) {
      console.error("Error:", error);
      showNotification("Failed to delete prisoner", "error");
    }
  }
}

function viewPrisoner(id) {
  window.location.href = `/profile.html?id=${id}`;
}

function editPrisoner(id) {
  showNotification("Edit feature coming soon", "info");
}

// Event listeners for filters
document.getElementById("searchInput")?.addEventListener("input", () => {
  currentPage = 1;
  loadPrisoners();
});

document.getElementById("blockFilter")?.addEventListener("change", () => {
  currentPage = 1;
  loadPrisoners();
});

document.getElementById("statusFilter")?.addEventListener("change", () => {
  currentPage = 1;
  loadPrisoners();
});

async function handleLogout() {
  try {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/index.html";
  } catch (error) {
    showNotification("Logout failed", "error");
  }
}

async function checkAuth() {
  try {
    const response = await fetch("/api/check-auth");
    const result = await response.json();
    if (!result.authenticated) {
      window.location.href = "/index.html";
    } else {
      const userNameSpan = document.getElementById("userName");
      if (userNameSpan) {
        userNameSpan.textContent = result.user?.username || "User";
      }
      loadPrisoners();
    }
  } catch (error) {
    console.error("Auth error:", error);
    window.location.href = "/index.html";
  }
}

// Make functions global
window.openAddPrisonerModal = openAddPrisonerModal;
window.closeModal = closeModal;
window.goToPage = goToPage;
window.viewPrisoner = viewPrisoner;
window.editPrisoner = editPrisoner;
window.deletePrisoner = deletePrisoner;
window.handleLogout = handleLogout;

// Initialize
checkAuth();
