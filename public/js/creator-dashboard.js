// Creator Dashboard JavaScript

const { apiCall, requireRole, getUserId } = window.aegisAuth;

if (!requireRole('Creator')) {
  throw new Error('Creator access required');
}

async function loadDashboard() {
  try {
    const [dashboard, earnings] = await Promise.all([
      apiCall('/creator/dashboard'),
      apiCall('/creator/earnings')
    ]);
    
    if (dashboard.success) {
      const data = dashboard.data;
      
      document.getElementById('totalEarnings').textContent = formatCurrency(data.earnings.total);
      document.getElementById('primaryEarnings').textContent = formatCurrency(data.earnings.primary);
      document.getElementById('passiveEarnings').textContent = formatCurrency(data.earnings.passive);
      document.getElementById('currentBalance').textContent = formatCurrency(data.currentBalance);
      
      document.getElementById('totalContent').textContent = data.totalContent;
      document.getElementById('activeContentCount').textContent = data.activeContent;
      document.getElementById('pendingContent').textContent = data.pendingContent;
      document.getElementById('licensesSold').textContent = data.totalLicensesSold;
    }
    
    if (earnings.success) {
      displayEarningsTable(earnings.data);
    }
  } catch (error) {
    showError('Error loading dashboard: ' + error.message);
  }
}

function displayEarningsTable(earnings) {
  const tbody = document.getElementById('earningsTable');
  
  if (earnings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">No earnings yet</td></tr>';
    return;
  }
  
  tbody.innerHTML = earnings.map(item => `
    <tr>
      <td>${item.licenseId}</td>
      <td>${truncate(item.contentTitle, 30)}</td>
      <td>${item.buyer}</td>
      <td>${item.type}</td>
      <td>${formatCurrency(item.purchasePrice)}</td>
      <td><strong>${formatCurrency(item.earnings)}</strong></td>
      <td>${formatDate(item.purchaseDate)}</td>
    </tr>
  `).join('');
}

function formatCurrency(amount) {
  return `$${parseFloat(amount || 0).toFixed(2)}`;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function truncate(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
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
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

loadDashboard();
