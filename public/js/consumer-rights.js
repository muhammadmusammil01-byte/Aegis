// Consumer Rights Dashboard JavaScript

const API_BASE = '/api';
let currentUserId = null;
let currentLicenses = [];

// Load dashboard
document.getElementById('loadDashboard')?.addEventListener('click', async () => {
  const userId = document.getElementById('userId').value;
  
  if (!userId) {
    showError('Please enter your User ID');
    return;
  }
  
  currentUserId = userId;
  await loadLicenses(userId);
});

// Load user's licenses
async function loadLicenses(userId) {
  try {
    const response = await fetch(`${API_BASE}/users/${userId}/licenses`);
    const result = await response.json();
    
    if (result.success) {
      currentLicenses = result.data;
      displayDashboard(result.data);
    } else {
      showError(result.error || 'Failed to load licenses');
    }
  } catch (error) {
    showError('Error: ' + error.message);
  }
}

// Display dashboard
function displayDashboard(licenses) {
  document.getElementById('dashboardView').style.display = 'block';
  
  // Update stats
  const totalLicenses = licenses.length;
  const resaleLicenses = licenses.filter(l => l.isForResale).length;
  const totalInvestment = licenses.reduce((sum, l) => sum + l.purchasePrice, 0);
  
  document.getElementById('totalLicenses').textContent = totalLicenses;
  document.getElementById('resaleLicenses').textContent = resaleLicenses;
  document.getElementById('totalInvestment').textContent = formatCurrency(totalInvestment);
  
  // Display licenses
  displayLicenses(licenses);
}

// Display licenses grid
function displayLicenses(licenses) {
  const grid = document.getElementById('licensesList');
  
  if (licenses.length === 0) {
    grid.innerHTML = '<p class="help-text">No licenses found</p>';
    return;
  }
  
  grid.innerHTML = licenses.map(license => `
    <div class="license-card" data-license-id="${license.licenseId}">
      ${license.isForResale ? '<span class="resale-badge">FOR RESALE</span>' : ''}
      <h3>${truncateText(license.contentId?.metadata?.title || 'Content License', 30)}</h3>
      <p><strong>License ID:</strong> ${license.licenseId}</p>
      <p><strong>Platform:</strong> ${license.contentId?.platform || 'N/A'}</p>
      <p><strong>Purchase Price:</strong> ${formatCurrency(license.purchasePrice)}</p>
      ${license.isForResale ? `<p><strong>Resale Price:</strong> ${formatCurrency(license.resalePrice)}</p>` : ''}
      <p><strong>Purchased:</strong> ${formatDate(license.purchasedAt)}</p>
      <button class="btn btn-primary btn-small view-license-btn" data-license-id="${license.licenseId}">
        View Details
      </button>
    </div>
  `).join('');
  
  // Add click handlers
  document.querySelectorAll('.view-license-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const licenseId = btn.dataset.licenseId;
      const license = licenses.find(l => l.licenseId === licenseId);
      if (license) openLicenseModal(license);
    });
  });
}

// Open license details modal
function openLicenseModal(license) {
  const modal = document.getElementById('licenseModal');
  const details = document.getElementById('licenseDetails');
  
  details.innerHTML = `
    <div class="success-details">
      <p><strong>License ID:</strong> ${license.licenseId}</p>
      <p><strong>Content ID:</strong> ${license.contentId?._id || 'N/A'}</p>
      <p><strong>Platform:</strong> ${license.contentId?.platform || 'N/A'}</p>
      <p><strong>Source URL:</strong> <a href="${license.contentId?.sourceUrl}" target="_blank">${truncateText(license.contentId?.sourceUrl, 50)}</a></p>
      <p><strong>Purchase Price:</strong> ${formatCurrency(license.purchasePrice)}</p>
      <p><strong>Royalty Percentage:</strong> ${license.royaltyPercentage}%</p>
      <p><strong>Purchased:</strong> ${formatDate(license.purchasedAt)}</p>
      <p><strong>Resale Status:</strong> ${license.isForResale ? `Listed at ${formatCurrency(license.resalePrice)}` : 'Not for resale'}</p>
    </div>
  `;
  
  const toggleBtn = document.getElementById('toggleResale');
  toggleBtn.textContent = license.isForResale ? 'Remove from Resale' : 'List for Resale';
  toggleBtn.dataset.licenseId = license.licenseId;
  toggleBtn.dataset.isForResale = license.isForResale;
  
  modal.style.display = 'flex';
  modal.classList.add('active');
}

// Download certificate
document.getElementById('downloadCertificate')?.addEventListener('click', async () => {
  const modal = document.getElementById('licenseModal');
  const licenseId = document.getElementById('toggleResale').dataset.licenseId;
  
  try {
    const response = await fetch(`${API_BASE}/transactions/certificate/${licenseId}`);
    const result = await response.json();
    
    if (result.success) {
      // Download as JSON
      const dataStr = JSON.stringify(result.data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', `certificate_${licenseId}.json`);
      link.click();
      
      showSuccess('Certificate downloaded!');
    } else {
      showError(result.error || 'Failed to download certificate');
    }
  } catch (error) {
    showError('Error: ' + error.message);
  }
});

// Toggle resale
document.getElementById('toggleResale')?.addEventListener('click', () => {
  const btn = document.getElementById('toggleResale');
  const licenseId = btn.dataset.licenseId;
  const isForResale = btn.dataset.isForResale === 'true';
  
  if (isForResale) {
    // Remove from resale
    removeFromResale(licenseId);
  } else {
    // List for resale
    openResaleModal(licenseId);
  }
});

// Open resale modal
function openResaleModal(licenseId) {
  const modal = document.getElementById('licenseModal');
  modal.style.display = 'none';
  modal.classList.remove('active');
  
  const resaleModal = document.getElementById('resaleModal');
  resaleModal.dataset.licenseId = licenseId;
  resaleModal.style.display = 'flex';
  resaleModal.classList.add('active');
}

// Confirm resale listing
document.getElementById('confirmResale')?.addEventListener('click', async () => {
  const resaleModal = document.getElementById('resaleModal');
  const licenseId = resaleModal.dataset.licenseId;
  const resalePrice = parseFloat(document.getElementById('resalePrice').value);
  
  if (!resalePrice || resalePrice <= 0) {
    showError('Please enter a valid resale price');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/transactions/resale/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseId, resalePrice })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess('License listed for resale!');
      resaleModal.style.display = 'none';
      resaleModal.classList.remove('active');
      document.getElementById('resalePrice').value = '';
      
      // Reload licenses
      if (currentUserId) {
        await loadLicenses(currentUserId);
      }
    } else {
      showError(result.error || 'Failed to list for resale');
    }
  } catch (error) {
    showError('Error: ' + error.message);
  }
});

// Cancel resale
document.getElementById('cancelResale')?.addEventListener('click', () => {
  const resaleModal = document.getElementById('resaleModal');
  resaleModal.style.display = 'none';
  resaleModal.classList.remove('active');
  document.getElementById('resalePrice').value = '';
});

// Remove from resale
async function removeFromResale(licenseId) {
  try {
    const response = await fetch(`${API_BASE}/transactions/resale/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseId })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess('License removed from resale!');
      
      const modal = document.getElementById('licenseModal');
      modal.style.display = 'none';
      modal.classList.remove('active');
      
      // Reload licenses
      if (currentUserId) {
        await loadLicenses(currentUserId);
      }
    } else {
      showError(result.error || 'Failed to remove from resale');
    }
  } catch (error) {
    showError('Error: ' + error.message);
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
