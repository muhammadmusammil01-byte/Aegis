// Admin Users JavaScript

const API_BASE = '/api';
let currentPage = 1;
let currentFilters = {};
let editingUserId = null;

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.tab) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
      
      if (btn.dataset.tab === 'stats') {
        loadStats();
      }
    }
  });
});

// Load users
async function loadUsers(page = 1) {
  try {
    const params = new URLSearchParams({
      page,
      limit: 50,
      ...currentFilters
    });

    const response = await fetch(`${API_BASE}/users?${params}`);
    const result = await response.json();

    if (result.success) {
      displayUsers(result.data.users);
      displayPagination(result.data.pagination, 'usersPagination');
    } else {
      showError('Failed to load users');
    }
  } catch (error) {
    showError('Error loading users: ' + error.message);
  }
}

// Display users table
function displayUsers(users) {
  const tbody = document.getElementById('usersTableBody');
  
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading">No users found</td></tr>';
    return;
  }
  
  tbody.innerHTML = users.map(user => `
    <tr>
      <td>${truncateText(user._id, 10)}</td>
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>${formatCurrency(user.balance)}</td>
      <td><span class="status-badge ${user.status.toLowerCase()}">${user.status}</span></td>
      <td>${formatDate(user.createdAt)}</td>
      <td>
        <button class="btn btn-secondary action-btn edit-user-btn" data-user-id="${user._id}">Edit</button>
      </td>
    </tr>
  `).join('');
  
  // Add click handlers
  document.querySelectorAll('.edit-user-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.userId;
      await loadUserForEdit(userId);
    });
  });
}

// Display pagination
function displayPagination(pagination, elementId) {
  const paginationDiv = document.getElementById(elementId);
  
  let html = '';
  
  if (pagination.page > 1) {
    html += `<button onclick="loadUsers(${pagination.page - 1})">Previous</button>`;
  }
  
  for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.pages, pagination.page + 2); i++) {
    html += `<button class="${i === pagination.page ? 'active' : ''}" onclick="loadUsers(${i})">${i}</button>`;
  }
  
  if (pagination.page < pagination.pages) {
    html += `<button onclick="loadUsers(${pagination.page + 1})">Next</button>`;
  }
  
  paginationDiv.innerHTML = html;
}

// Apply filters
document.getElementById('applyUserFilters')?.addEventListener('click', () => {
  const role = document.getElementById('roleFilter').value;
  const status = document.getElementById('statusFilter').value;
  
  currentFilters = {};
  if (role) currentFilters.role = role;
  if (status) currentFilters.status = status;
  
  loadUsers(1);
});

// Create user
document.getElementById('createUser')?.addEventListener('click', () => {
  const modal = document.getElementById('createUserModal');
  modal.style.display = 'flex';
  modal.classList.add('active');
});

// Confirm create user
document.getElementById('confirmCreateUser')?.addEventListener('click', async () => {
  const username = document.getElementById('newUsername').value;
  const email = document.getElementById('newEmail').value;
  const role = document.getElementById('newRole').value;
  
  if (!username || !email) {
    showError('Please fill in all fields');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, role })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess('User created successfully!');
      
      const modal = document.getElementById('createUserModal');
      modal.style.display = 'none';
      modal.classList.remove('active');
      
      document.getElementById('newUsername').value = '';
      document.getElementById('newEmail').value = '';
      
      loadUsers(currentPage);
    } else {
      showError(result.error || 'Failed to create user');
    }
  } catch (error) {
    showError('Error: ' + error.message);
  }
});

// Load user for edit
async function loadUserForEdit(userId) {
  try {
    const response = await fetch(`${API_BASE}/users/${userId}`);
    const result = await response.json();
    
    if (result.success) {
      const user = result.data;
      editingUserId = userId;
      
      document.getElementById('editRole').value = user.role;
      document.getElementById('editStatus').value = user.status;
      document.getElementById('editBalance').value = user.balance;
      
      const modal = document.getElementById('editUserModal');
      modal.style.display = 'flex';
      modal.classList.add('active');
    } else {
      showError(result.error || 'Failed to load user');
    }
  } catch (error) {
    showError('Error: ' + error.message);
  }
}

// Confirm edit user
document.getElementById('confirmEditUser')?.addEventListener('click', async () => {
  if (!editingUserId) return;
  
  const role = document.getElementById('editRole').value;
  const status = document.getElementById('editStatus').value;
  const balance = parseFloat(document.getElementById('editBalance').value);
  
  try {
    const response = await fetch(`${API_BASE}/users/${editingUserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, status, balance })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess('User updated successfully!');
      
      const modal = document.getElementById('editUserModal');
      modal.style.display = 'none';
      modal.classList.remove('active');
      
      editingUserId = null;
      loadUsers(currentPage);
    } else {
      showError(result.error || 'Failed to update user');
    }
  } catch (error) {
    showError('Error: ' + error.message);
  }
});

// Delete user
document.getElementById('deleteUser')?.addEventListener('click', async () => {
  if (!editingUserId) return;
  
  if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/users/${editingUserId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess('User deleted successfully!');
      
      const modal = document.getElementById('editUserModal');
      modal.style.display = 'none';
      modal.classList.remove('active');
      
      editingUserId = null;
      loadUsers(currentPage);
    } else {
      showError(result.error || 'Failed to delete user');
    }
  } catch (error) {
    showError('Error: ' + error.message);
  }
});

// Load stats
async function loadStats() {
  try {
    const response = await fetch(`${API_BASE}/admin/stats`);
    const result = await response.json();
    
    if (result.success) {
      const stats = result.data;
      
      document.getElementById('statTotalUsers').textContent = stats.users.total;
      document.getElementById('statTotalCreators').textContent = stats.users.creators;
      document.getElementById('statTotalContent').textContent = stats.content.total;
      document.getElementById('statActiveContent').textContent = stats.content.active;
      document.getElementById('statTotalLicenses').textContent = stats.licenses.total;
      document.getElementById('statTotalVolume').textContent = formatCurrency(stats.revenue.totalVolume);
    } else {
      showError('Failed to load stats');
    }
  } catch (error) {
    showError('Error loading stats: ' + error.message);
  }
}

// Modal close handlers
document.querySelectorAll('.modal .close').forEach(closeBtn => {
  closeBtn.addEventListener('click', () => {
    const modal = closeBtn.closest('.modal');
    modal.style.display = 'none';
    modal.classList.remove('active');
  });
});

window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
    e.target.classList.remove('active');
  }
});

// Utility functions
function formatCurrency(amount) {
  return `$${parseFloat(amount).toFixed(2)}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function truncateText(text, maxLength = 50) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function showError(message) {
  showToast(message, 'error');
}

function showSuccess(message) {
  showToast(message, 'success');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 2rem;
    background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#0066ff'};
    color: white;
    border-radius: 4px;
    z-index: 10000;
    max-width: 400px;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Initialize
loadUsers();
