
let currentPrograms = [];

async function loadPrograms() {
  try {
    const params = {
      type: document.getElementById("typeFilter")?.value || "all",
      status: document.getElementById("statusFilter")?.value || "all",
    };

    const query = new URLSearchParams(params).toString();
    const response = await fetch(`/api/programs${query ? "?" + query : ""}`);
    const programs = await response.json();
    currentPrograms = programs;

    const grid = document.getElementById("programsGrid");

    
    for (let program of programs) {
      const statsResponse = await fetch(`/api/programs/${program.id}/stats`);
      const stats = await statsResponse.json();
      program.enrolled_count = stats.enrolled_count || 0;
      program.completion_rate = Math.round(stats.avg_completion || 0);
    }

    grid.innerHTML = programs
      .map(
        (program) => `
            <div class="program-card">
                <div class="program-card-header">
                    <h3>${program.name || "N/A"}</h3>
                    <p>${program.program_type || "N/A"}</p>
                </div>
                <div class="program-card-body">
                    <p><strong>Instructor:</strong> ${program.instructor || "N/A"}</p>
                    <p><strong>Duration:</strong> ${program.duration || "N/A"}</p>
                    <div class="program-stats">
                        <div>Current Enrollment<br><strong style="font-size: 24px; color: var(--primary-color);">${program.enrolled_count || 0}/${program.max_capacity || 50}</strong></div>
                        <div>Completion Rate<br><strong style="font-size: 24px; color: var(--secondary-color);">${program.completion_rate || 0}%</strong></div>
                    </div>
                    <p style="font-size: 12px; color: #666; margin-top: 10px;">${program.description ? program.description.substring(0, 100) + "..." : ""}</p>
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        ${getStatusBadge(program.status)}
                        <button class="btn-secondary" style="margin-left: auto;" onclick="viewProgramEnrollments(${program.id})">View Enrollments</button>
                    </div>
                </div>
            </div>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Error loading programs:", error);
    showNotification("Failed to load programs", "error");
  }
}


async function viewProgramEnrollments(programId) {
  try {
    const response = await fetch(`/api/programs/${programId}/enrollments`);
    const enrollments = await response.json();

    const program = currentPrograms.find((p) => p.id === programId);

    let modalContent = `
            <div class="modal-header">
                <h3>${program ? program.name : "Program"} - Enrollments (${enrollments.length})</h3>
                <span class="close-modal" onclick="closeModal('viewEnrollmentsModal')">&times;</span>
            </div>
            <div style="max-height: 400px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 10px; text-align: left;">Prisoner Name</th>
                            <th style="padding: 10px; text-align: left;">ID Number</th>
                            <th style="padding: 10px; text-align: left;">Enrollment Date</th>
                            <th style="padding: 10px; text-align: left;">Progress</th>
                            <th style="padding: 10px; text-align: left;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${enrollments
                          .map(
                            (e) => `
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 10px;">${e.prisoner_name}</td>
                                <td style="padding: 10px;">${e.id_number}</td>
                                <td style="padding: 10px;">${formatDate(e.enrollment_date)}</td>
                                <td style="padding: 10px;">${e.completion_percentage || 0}%</td>
                                <td style="padding: 10px;">${getStatusBadge(e.status)}</td>
                            </tr>
                        `,
                          )
                          .join("")}
                        ${enrollments.length === 0 ? '<tr><td colspan="5" style="padding: 20px; text-align: center;">No enrollments yet</td></tr>' : ""}
                    </tbody>
                </table>
            </div>
        `;

    let modal = document.getElementById("viewEnrollmentsModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "viewEnrollmentsModal";
      modal.className = "modal";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `<div class="modal-content" style="max-width: 800px;">${modalContent}</div>`;
    modal.style.display = "flex";
  } catch (error) {
    console.error("Error loading enrollments:", error);
    showNotification("Failed to load enrollments", "error");
  }
}

async function openAddProgramModal() {
  document.getElementById("addProgramModal").style.display = "flex";
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = "none";
}

document
  .getElementById("addProgramForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      const response = await fetch("/api/programs", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (result.success) {
        showNotification("Program added successfully!");
        closeModal("addProgramModal");
        e.target.reset();
        loadPrograms();
      }
    } catch (error) {
      showNotification("Failed to add program", "error");
    }
  });

document.getElementById("typeFilter")?.addEventListener("change", loadPrograms);
document
  .getElementById("statusFilter")
  ?.addEventListener("change", loadPrograms);

async function handleLogout() {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/index.html";
}

async function checkAuth() {
  try {
    const response = await fetch("/api/check-auth");
    const result = await response.json();
    if (!result.authenticated) {
      window.location.href = "/index.html";
    } else {
      document.getElementById("userName").textContent =
        result.user?.username || "User";
      loadPrograms();
    }
  } catch (error) {
    window.location.href = "/index.html";
  }
}


window.openAddProgramModal = openAddProgramModal;
window.closeModal = closeModal;
window.viewProgramEnrollments = viewProgramEnrollments;
window.handleLogout = handleLogout;

checkAuth();
