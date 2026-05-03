async function loadDashboard() {
    try {
       
        const statsResponse = await fetch('/api/dashboard/stats');
        const stats = await statsResponse.json();
        
        document.getElementById('totalPrisoners').textContent = stats.totalPrisoners || 0;
        document.getElementById('activePrograms').textContent = stats.activePrograms || 0;
        document.getElementById('currentEnrollments').textContent = stats.currentEnrollments || 0;
        document.getElementById('sessionsThisMonth').textContent = stats.sessionsThisMonth || 0;
        
        
        const activitiesResponse = await fetch('/api/dashboard/recent-activity');
        const activities = await activitiesResponse.json();
        
        const tbody = document.getElementById('recentActivity');
        if (!tbody) return;
        
        if (activities && activities.length > 0) {
            tbody.innerHTML = activities.map(activity => {
                
                let dateString = 'N/A';
                if (activity.activity_date) {
                    const date = new Date(activity.activity_date);
                    if (!isNaN(date.getTime())) {
                        dateString = date.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                        });
                    }
                } else if (activity.formatted_date) {
                    const date = new Date(activity.formatted_date);
                    if (!isNaN(date.getTime())) {
                        dateString = date.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                        });
                    }
                }
                
                return `
                    <tr>
                        <td>${activity.prisoner_name || 'N/A'}</td>
                        <td>${activity.program_name || activity.activity_type || 'N/A'}</td>
                        <td>${dateString}</td>
                        <td>${getStatusBadge(activity.status)}</td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No recent activity</td></tr>';
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        const tbody = document.getElementById('recentActivity');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Error loading activity</td></tr>';
        }
    }
}

async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/index.html';
    } catch (error) {
        showNotification('Logout failed', 'error');
    }
}

async function checkAuth() {
    try {
        const response = await fetch('/api/check-auth');
        const result = await response.json();
        if (!result.authenticated) {
            window.location.href = '/index.html';
        } else {
            const userNameSpan = document.getElementById('userName');
            if (userNameSpan) {
                userNameSpan.textContent = result.user?.username || 'User';
            }
            loadDashboard();
        }
    } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '/index.html';
    }
}


window.handleLogout = handleLogout;


checkAuth();