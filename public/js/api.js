const API = {
  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Request failed");
      }

      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  login(username, password) {
    return this.request("/api/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  logout() {
    return this.request("/api/logout", { method: "POST" });
  },

  checkAuth() {
    return this.request("/api/check-auth");
  },

  getPrisoners(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/prisoners${query ? "?" + query : ""}`);
  },

  getPrisoner(id) {
    return this.request(`/api/prisoners/${id}`);
  },

  addPrisoner(formData) {
    return fetch("/api/prisoners", {
      method: "POST",
      body: formData,
    }).then((res) => res.json());
  },

  updatePrisoner(id, formData) {
    return fetch(`/api/prisoners/${id}`, {
      method: "PUT",
      body: formData,
    }).then((res) => res.json());
  },

  deletePrisoner(id) {
    return this.request(`/api/prisoners/${id}`, { method: "DELETE" });
  },

  getPrograms(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/programs${query ? "?" + query : ""}`);
  },

  getProgram(id) {
    return this.request(`/api/programs/${id}`);
  },

  addProgram(formData) {
    return fetch("/api/programs", {
      method: "POST",
      body: formData,
    }).then((res) => res.json());
  },

  updateProgram(id, data) {
    return this.request(`/api/programs/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteProgram(id) {
    return this.request(`/api/programs/${id}`, { method: "DELETE" });
  },

  getStaff(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/staff${query ? "?" + query : ""}`);
  },

  addStaff(formData) {
    return fetch("/api/staff", {
      method: "POST",
      body: formData,
    }).then((res) => res.json());
  },

  updateStaff(id, data) {
    return this.request(`/api/staff/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteStaff(id) {
    return this.request(`/api/staff/${id}`, { method: "DELETE" });
  },

  addSession(data) {
    return this.request("/api/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getSessions(prisonerId = null) {
    const query = prisonerId ? `?prisoner_id=${prisonerId}` : "";
    return this.request(`/api/sessions${query}`);
  },

  deleteSession(id) {
    return this.request(`/api/sessions/${id}`, { method: "DELETE" });
  },

  updateSession(id, data) {
    return this.request(`/api/sessions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  addEnrollment(data) {
    return this.request("/api/enrollments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateEnrollment(id, data) {
    return this.request(`/api/enrollments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteEnrollment(id) {
    return this.request(`/api/enrollments/${id}`, { method: "DELETE" });
  },

  getEnrollments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/enrollments${query ? "?" + query : ""}`);
  },

  getDashboardStats() {
    return this.request("/api/dashboard/stats");
  },

  getRecentActivity() {
    return this.request("/api/dashboard/recent-activity");
  },

  getProgramStats() {
    return this.request("/api/reports/program-stats");
  },

  getFacilities() {
    return this.request("/api/facilities");
  },

  updateFacility(id, data) {
    return this.request(`/api/facilities/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};

function showNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === "success" ? "#2ecc71" : type === "error" ? "#e74c3c" : "#3498db"};
        color: white;
        border-radius: 8px;
        z-index: 2000;
        animation: slideIn 0.3s ease;
    `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusBadge(status) {
  const statusMap = {
    Active: "status-active",
    "In Progress": "status-active",
    Enrolled: "status-active",
    Completed: "status-completed",
    "On Warning": "status-warning",
    Inactive: "status-inactive",
    Scheduled: "status-active",
    Cancelled: "status-inactive",
  };
  const className = statusMap[status] || "status-active";
  return `<span class="statuq s-badge ${className}">${status}</span>`;
}
