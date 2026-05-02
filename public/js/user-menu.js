
function loadUserMenu() {
    const userMenu = document.querySelector('.user-menu');
    if (userMenu && !userMenu.querySelector('.change-password-btn')) {
        const changePwdBtn = document.createElement('button');
        changePwdBtn.className = 'change-password-btn';
        changePwdBtn.textContent = '🔐 Change Password';
        changePwdBtn.style.cssText = 'background: none; border: none; color: var(--primary-color); cursor: pointer; margin-right: 15px;';
        changePwdBtn.onclick = openPasswordModal;
        
        const logoutBtn = userMenu.querySelector('.logout-btn');
        if (logoutBtn) {
            userMenu.insertBefore(changePwdBtn, logoutBtn);
        } else {
            userMenu.appendChild(changePwdBtn);
        }
    }
}

// Password change functions
function openPasswordModal() {
    let modal = document.getElementById('changePasswordModal');
    if (!modal) {
        createPasswordModal();
        modal = document.getElementById('changePasswordModal');
    }
    modal.style.display = 'flex';
    const form = document.getElementById('changePasswordForm');
    if (form) form.reset();
    const errorDiv = document.getElementById('passwordError');
    const successDiv = document.getElementById('passwordSuccess');
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
}

function closePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.style.display = 'none';
}

function createPasswordModal() {
    const modalHTML = `
        <div id="changePasswordModal" class="modal">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h3>🔐 Change Password</h3>
                    <span class="close-modal" onclick="closePasswordModal()">&times;</span>
                </div>
                <form id="changePasswordForm">
                    <div class="form-group">
                        <label>Current Password</label>
                        <input type="password" id="currentPassword" required placeholder="Enter your current password">
                    </div>
                    <div class="form-group">
                        <label>New Password</label>
                        <input type="password" id="newPassword" required placeholder="Enter new password">
                        <small style="color: #666; font-size: 11px;">Minimum 6 characters</small>
                        <div class="password-strength">
                            <div class="password-strength-bar"></div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Confirm New Password</label>
                        <input type="password" id="confirmPassword" required placeholder="Confirm new password">
                    </div>
                    <div id="passwordError" style="color: red; font-size: 12px; margin-bottom: 10px; display: none;"></div>
                    <div id="passwordSuccess" style="color: green; font-size: 12px; margin-bottom: 10px; display: none;"></div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" class="btn-secondary" onclick="closePasswordModal()">Cancel</button>
                        <button type="submit" class="btn-primary">Change Password</button>
                    </div>
                </form>
            </div>
        </div>
        <style>
            .password-strength {
                height: 4px;
                background: #e1e8ed;
                margin-top: 5px;
                border-radius: 2px;
                overflow: hidden;
            }
            .password-strength-bar {
                height: 100%;
                width: 0%;
                transition: width 0.3s, background 0.3s;
            }
            .password-strength-bar.weak { background: #e74c3c; width: 33%; }
            .password-strength-bar.medium { background: #f39c12; width: 66%; }
            .password-strength-bar.strong { background: #2ecc71; width: 100%; }
        </style>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    document.getElementById('newPassword')?.addEventListener('input', function(e) {
        const strength = checkPasswordStrength(e.target.value);
        const bar = document.querySelector('.password-strength-bar');
        if (bar) {
            bar.className = `password-strength-bar ${strength}`;
        }
    });
    
    document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (newPassword.length < 6) {
            showPasswordError('New password must be at least 6 characters long');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showPasswordError('New passwords do not match');
            return;
        }
        
        if (currentPassword === newPassword) {
            showPasswordError('New password must be different from current password');
            return;
        }
        
        try {
            const response = await fetch('/api/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showPasswordSuccess('Password changed successfully! Please login again.');
                setTimeout(() => {
                    fetch('/api/logout', { method: 'POST' }).then(() => {
                        window.location.href = '/index.html';
                    });
                }, 2000);
            } else {
                showPasswordError(result.error || 'Failed to change password');
            }
        } catch (error) {
            showPasswordError('An error occurred. Please try again.');
        }
    });
}

function checkPasswordStrength(password) {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
}

function showPasswordError(message) {
    const errorDiv = document.getElementById('passwordError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

function showPasswordSuccess(message) {
    const successDiv = document.getElementById('passwordSuccess');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
}

// Make functions global
window.openPasswordModal = openPasswordModal;
window.closePasswordModal = closePasswordModal;