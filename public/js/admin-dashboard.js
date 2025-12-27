// Admin Dashboard JavaScript

const { apiCall, requireRole } = window.aegisAuth;

// Check admin role
if (!requireRole('Admin')) {
  throw new Error('Admin access required');
}

// Load dashboard data
async function loadDashboard() {
  try {
    const stats = await apiCall('/admin/stats');
    
    if (stats.success) {
      const data = stats.data;
      
      // Update KPI cards
      document.getElementById('totalRevenue').textContent = formatCurrency(data.revenue.totalVolume);
      document.getElementById('platformFees').textContent = formatCurrency(data.revenue.totalVolume * 0.05);
      document.getElementById('totalUsers').textContent = data.users.total;
      document.getElementById('activeContent').textContent = data.content.active;
      
      const verificationRate = data.content.total > 0 
        ? ((data.content.active / data.content.total) * 100).toFixed(1)
        : 0;
      document.getElementById('verificationRate').textContent = verificationRate + '%';
      document.getElementById('licensesSold').textContent = data.licenses.total;
      
      // Load additional data
      await loadUserDistribution();
      await loadPlatformBreakdown();
      await loadRecentTransactions();
      await loadPendingActions();
    }
  } catch (error) {
    showError('Error loading dashboard: ' + error.message);
  }
}

async function loadUserDistribution() {
  try {
    const response = await apiCall('/users');
    if (response.success) {
      const users = response.data.users;
      const roleCount = {
        Admin: 0,
        Creator: 0,
        Distributor: 0,
        Consumer: 0
      };
      
      users.forEach(user => {
        roleCount[user.role] = (roleCount[user.role] || 0) + 1;
      });
      
      const container = document.getElementById('userDistribution');
      container.innerHTML = `
        <div class="stat-list">
          <div class="stat-item">
            <span>Admins:</span>
            <strong>${roleCount.Admin}</strong>
          </div>
          <div class="stat-item">
            <span>Creators:</span>
            <strong>${roleCount.Creator}</strong>
          </div>
          <div class="stat-item">
            <span>Distributors:</span>
            <strong>${roleCount.Distributor}</strong>
          </div>
          <div class="stat-item">
            <span>Consumers:</span>
            <strong>${roleCount.Consumer}</strong>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading user distribution:', error);
  }
}

async function loadPlatformBreakdown() {
  try {
    const response = await apiCall('/admin/content');
    if (response.success) {
      const content = response.data.contentLinks;
      const platformCount = {};
      
      content.forEach(item => {
        platformCount[item.platform] = (platformCount[item.platform] || 0) + 1;
      });
      
      const container = document.getElementById('platformBreakdown');
      container.innerHTML = `
        <div class="stat-list">
          ${Object.entries(platformCount).map(([platform, count]) => `
            <div class="stat-item">
              <span>${platform}:</span>
              <strong>${count}</strong>
            </div>
          `).join('')}
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading platform breakdown:', error);
  }
}

async function loadRecentTransactions() {
  try {
    const response = await apiCall('/marketplace?limit=10');
    if (response.success) {
      const content = response.data.contentLinks;
      const container = document.getElementById('recentTransactions');
      
      if (content.length === 0) {
        container.innerHTML = '<p>No recent transactions</p>';
        return;
      }
      
      container.innerHTML = `
        <table class="admin-table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Creator</th>
              <th>Price</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${content.slice(0, 5).map(item => `
              <tr>
                <td>${item.platform}</td>
                <td>${item.originalCreatorId?.username || 'Unknown'}</td>
                <td>${formatCurrency(item.currentPrice)}</td>
                <td>${formatDate(item.createdAt)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (error) {
    console.error('Error loading transactions:', error);
  }
}

async function loadPendingActions() {
  try {
    const response = await apiCall('/admin/content?status=Pending');
    if (response.success) {
      const pending = response.data.contentLinks;
      const container = document.getElementById('pendingActions');
      
      container.innerHTML = `
        <div class="alert-box">
          <p><strong>${pending.length}</strong> content items pending review</p>
          <a href="/admin-content.html" class="btn btn-primary">Review Now</a>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading pending actions:', error);
  }
}

function formatCurrency(amount) {
  return `$${parseFloat(amount || 0).toFixed(2)}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function showError(message) {
  showToast(message, 'error');
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
loadDashboard();
