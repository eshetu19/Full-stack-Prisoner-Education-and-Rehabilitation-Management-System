let currentPage = 1;
let totalPages = 1;

async function loadStaff() {
  try {
    const search = document.getElementById("searchInput")?.value || "";
    const role = document.getElementById("roleFilter")?.value || "all";
    const facility = document.getElementById("facilityFilter")?.value || "all";
    const status = document.getElementById("statusFilter")?.value || "all";

    const response = await fetch(
      `/api/staff?page=${currentPage}&limit=10&search=${search}&role=${role}&facility=${facility}&status=${status}`,
    );
    const data = await response.json();

    const tbody = document.getElementById("staffTable");
    if (!tbody) return;

    document.getElementById("totalStaff").textContent = data.total || 0;
    const activeInstructors = (data.staff || []).filter(
      (s) =>
        s.employment_status === "Active" &&
        (s.role === "Instructor" || s.role === "Lead Instructor"),
    ).length;
    document.getElementById("activeInstructors").textContent =
      activeInstructors;
    const onLeaveCount = (data.staff || []).filter(
      (s) => s.employment_status === "On leave",
    ).length;
    document.getElementById("onLeaveCount").textContent = onLeaveCount;

    if (data.staff && data.staff.length > 0) {
      tbody.innerHTML = data.staff
        .map(
          (staff) => `
                <tr>
                    <td>
                        ${staff.image_url ? `<img src="${staff.image_url}" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover; margin-right: 10px; vertical-align: middle;">` : '<span style="font-size: 24px; margin-right: 10px;">👤</span>'}
                        ${staff.name || "N/A"}
                    </td>
                    <td>${staff.role || "N/A"}</td>
                    <td>${staff.facility || "N/A"}</td>
                    <td>${getStatusBadge(staff.employment_status)}</td>
                    <td class="action-icons">
                        <button class="view-btn" onclick="viewStaff(${staff.id})" title="View"><i class='bx bx-show'></i></button>
                        <button class="edit-btn" onclick="editStaff(${staff.id})" title="Edit"><i class='bx bx-edit-alt'></i></button>
                        <button class="delete-btn" onclick="deleteStaff(${staff.id})" title="Delete"><i class='bx bx-trash'></i></button>
                    </td>
                </tr>
            `,
        )
        .join("");
    } else {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align: center;">No staff members found</td></tr>';
    }

    totalPages = Math.ceil((data.total || 0) / 10);
    updatePagination();
  } catch (error) {
    console.error("Error loading staff:", error);
    const tbody = document.getElementById("staffTable");
    if (tbody) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align: center; color: red;">Error loading staff data</td></tr>';
    }
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
  loadStaff();
}

function openAddStaffModal() {
  const modal = document.getElementById("addStaffModal");
  if (modal) {
    modal.style.display = "flex";
    const form = document.getElementById("addStaffForm");
    if (form) form.reset();
    loadFacilitiesForModal();
  } else {
    showNotification("Modal not found", "error");
  }
}

async function loadFacilitiesForModal() {
  try {
    const response = await fetch("/api/facilities");
    const facilities = await response.json();
    const facilitySelect = document.getElementById("facilitySelect");
    if (facilitySelect) {
      facilitySelect.innerHTML = '<option value="">Select Facility</option>';
      facilities.forEach((f) => {
        facilitySelect.innerHTML += `<option value="${f.name}">${f.name}</option>`;
      });
    }
  } catch (error) {
    console.error("Error loading facilities:", error);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
  }
}

document
  .getElementById("addStaffForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (result.success) {
        showNotification(
          "Staff member added successfully! ID: " + result.staff_id,
        );
        closeModal("addStaffModal");
        e.target.reset();
        loadStaff();
      } else {
        showNotification(result.error || "Failed to add staff member", "error");
      }
    } catch (error) {
      console.error("Error:", error);
      showNotification("Failed to add staff member", "error");
    }
  });

async function deleteStaff(id) {
  if (confirm("Are you sure you want to delete this staff member?")) {
    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        showNotification("Staff member deleted successfully");
        loadStaff();
      } else {
        showNotification(result.error || "Failed to delete", "error");
      }
    } catch (error) {
      console.error("Error:", error);
      showNotification("Failed to delete staff member", "error");
    }
  }
}

async function viewStaff(id) {
  try {
    const response = await fetch(`/api/staff/${id}`);
    const staff = await response.json();

    const content = document.getElementById("viewStaffContent");
    content.innerHTML = `
            <div style="text-align: center;">
                ${staff.image_url ? `<img src="${staff.image_url}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin-bottom: 15px;">` : '<div style="font-size: 80px; margin-bottom: 15px;">👤</div>'}
                <h3>${staff.name}</h3>
                <p><strong>Staff ID:</strong> ${staff.staff_id}</p>
                <hr>
                <p><strong>Role:</strong> ${staff.role}</p>
                <p><strong>Facility:</strong> ${staff.facility}</p>
                <p><strong>Education:</strong> ${staff.education}</p>
                <p><strong>Gender:</strong> ${staff.gender}</p>
                <p><strong>Age:</strong> ${staff.age}</p>
                <p><strong>Status:</strong> ${staff.employment_status}</p>
                <p><strong>Hire Date:</strong> ${formatDate(staff.hire_date)}</p>
            </div>
        `;

    document.getElementById("viewStaffModal").style.display = "flex";
  } catch (error) {
    console.error("Error:", error);
    showNotification("Failed to load staff details", "error");
  }
}

async function editStaff(id) {
  try {
    const response = await fetch(`/api/staff/${id}`);
    const staff = await response.json();

    document.getElementById("editStaffId").value = staff.id;
    document.getElementById("editName").value = staff.name;
    document.getElementById("editRole").value = staff.role;
    document.getElementById("editFacility").value = staff.facility;
    document.getElementById("editStatus").value = staff.employment_status;

    document.getElementById("editStaffModal").style.display = "flex";
  } catch (error) {
    console.error("Error:", error);
    showNotification("Failed to load staff data", "error");
  }
}

document
  .getElementById("editStaffForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("editStaffId").value;
    const data = {
      name: document.getElementById("editName").value,
      role: document.getElementById("editRole").value,
      facility: document.getElementById("editFacility").value,
      employment_status: document.getElementById("editStatus").value,
    };

    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (result.success) {
        showNotification("Staff member updated successfully");
        closeModal("editStaffModal");
        loadStaff();
      } else {
        showNotification(result.error || "Failed to update", "error");
      }
    } catch (error) {
      console.error("Error:", error);
      showNotification("Failed to update staff member", "error");
    }
  });

async function loadFilterOptions() {
  try {
    const response = await fetch("/api/facilities");
    const facilities = await response.json();
    const facilityFilter = document.getElementById("facilityFilter");
    if (facilityFilter) {
      facilityFilter.innerHTML = '<option value="all">All Facilities</option>';
      facilities.forEach((f) => {
        facilityFilter.innerHTML += `<option value="${f.name}">${f.name}</option>`;
      });
    }
  } catch (error) {
    console.error("Error loading filter options:", error);
  }
}

document.getElementById("searchInput")?.addEventListener("input", () => {
  currentPage = 1;
  loadStaff();
});

document.getElementById("roleFilter")?.addEventListener("change", () => {
  currentPage = 1;
  loadStaff();
});

document.getElementById("facilityFilter")?.addEventListener("change", () => {
  currentPage = 1;
  loadStaff();
});

document.getElementById("statusFilter")?.addEventListener("change", () => {
  currentPage = 1;
  loadStaff();
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
      loadFilterOptions();
      loadStaff();
    }
  } catch (error) {
    console.error("Auth error:", error);
    window.location.href = "/index.html";
  }
}

window.openAddStaffModal = openAddStaffModal;
window.closeModal = closeModal;
window.goToPage = goToPage;
window.viewStaff = viewStaff;
window.editStaff = editStaff;
window.deleteStaff = deleteStaff;
window.handleLogout = handleLogout;

checkAuth();
