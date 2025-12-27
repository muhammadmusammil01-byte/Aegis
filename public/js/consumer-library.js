// Consumer Library JavaScript

const { apiCall } = window.aegisAuth;

let currentLicenses = [];

async function loadDashboard() {
  try {
    const [dashboard, library] = await Promise.all([
      apiCall('/consumer/dashboard'),
      apiCall('/consumer/library')
    ]);
    
    if (dashboard.success) {
      const data = dashboard.data;
      
      document.getElementById('totalLicenses').textContent = data.totalLicenses;
      document.getElementById('totalSpent').textContent = formatCurrency(data.totalSpent);
      document.getElementById('resaleListings').textContent = data.resaleListings;
      document.getElementById('potentialRevenue').textContent = formatCurrency(data.potentialRevenue);
    }
    
    if (library.success) {
      currentLicenses = library.data;
      displayLibrary(library.data);
    }
  } catch (error) {
    showError('Error loading library: ' + error.message);
  }
}

function displayLibrary(licenses) {
  const grid = document.getElementById('libraryGrid');
  
  if (licenses.length === 0) {
    grid.innerHTML = '<p class="loading">No licenses yet. <a href="/marketplace.html">Browse the marketplace</a></p>';
    return;
  }
  
  grid.innerHTML = licenses.map(license => `
    <div class="content-card license-card" data-license-id="${license.licenseId}">
      ${license.isForResale ? '<span class="resale-badge">FOR RESALE</span>' : ''}
      <div class="content-card-header">
        <span class="platform-badge">${license.contentId?.platform || 'N/A'}</span>
      </div>
      <div class="content-card-body">
        <h3>${truncate(license.contentId?.metadata?.title || 'Content License', 30)}</h3>
        <p><strong>License ID:</strong> ${license.licenseId}</p>
        <p><strong>Purchase Price:</strong> ${formatCurrency(license.purchasePrice)}</p>
        ${license.isForResale ? `<p><strong>Resale Price:</strong> ${formatCurrency(license.resalePrice)}</p>` : ''}
        <p><strong>Purchased:</strong> ${formatDate(license.purchasedAt)}</p>
      </div>
      <div class="content-card-footer">
        <button class="btn btn-small btn-primary view-license-btn" data-license-id="${license.licenseId}">
          View Details
        </button>
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  document.querySelectorAll('.view-license-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const license = licenses.find(l => l.licenseId === btn.dataset.licenseId);
      if (license) openLicenseModal(license);
    });
  });
}

function openLicenseModal(license) {
  const modal = document.getElementById('licenseModal');
  const details = document.getElementById('licenseDetails');
  
  details.innerHTML = `
    <div class="success-details">
      <p><strong>License ID:</strong> ${license.licenseId}</p>
      <p><strong>Content:</strong> ${license.contentId?.metadata?.title || 'N/A'}</p>
      <p><strong>Platform:</strong> ${license.contentId?.platform || 'N/A'}</p>
      <p><strong>URL:</strong> <a href="${license.contentId?.sourceUrl}" target="_blank">${truncate(license.contentId?.sourceUrl, 50)}</a></p>
      <p><strong>Purchase Price:</strong> ${formatCurrency(license.purchasePrice)}</p>
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
document.getElementById('downloadCert')?.addEventListener('click', async () => {
  const licenseId = document.getElementById('toggleResale').dataset.licenseId;
  
  try {
    const response = await apiCall(`/transactions/certificate/${licenseId}`);
    
    if (response.success) {
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', `certificate_${licenseId}.json`);
      link.click();
      
      showToast('Certificate downloaded!', 'success');
    }
  } catch (error) {
    showError('Error downloading certificate: ' + error.message);
  }
});

// Toggle resale
document.getElementById('toggleResale')?.addEventListener('click', () => {
  const btn = document.getElementById('toggleResale');
  const licenseId = btn.dataset.licenseId;
  const isForResale = btn.dataset.isForResale === 'true';
  
  if (isForResale) {
    removeFromResale(licenseId);
  } else {
    openResaleModal(licenseId);
  }
});

function openResaleModal(licenseId) {
  const modal = document.getElementById('licenseModal');
  modal.style.display = 'none';
  modal.classList.remove('active');
  
  const resaleModal = document.getElementById('resaleModal');
  resaleModal.dataset.licenseId = licenseId;
  resaleModal.style.display = 'flex';
  resaleModal.classList.add('active');
}

document.getElementById('confirmResale')?.addEventListener('click', async () => {
  const resaleModal = document.getElementById('resaleModal');
  const licenseId = resaleModal.dataset.licenseId;
  const resalePrice = parseFloat(document.getElementById('resalePrice').value);
  
  if (!resalePrice || resalePrice <= 0) {
    showError('Please enter a valid resale price');
    return;
  }
  
  try {
    const response = await apiCall('/transactions/resale/list', {
      method: 'POST',
      body: JSON.stringify({ licenseId, resalePrice })
    });
    
    if (response.success) {
      showToast('License listed for resale!', 'success');
      resaleModal.style.display = 'none';
      resaleModal.classList.remove('active');
      document.getElementById('resalePrice').value = '';
      
      await loadDashboard();
    }
  } catch (error) {
    showError('Error listing for resale: ' + error.message);
  }
});

async function removeFromResale(licenseId) {
  try {
    const response = await apiCall('/transactions/resale/remove', {
      method: 'POST',
      body: JSON.stringify({ licenseId })
    });
    
    if (response.success) {
      showToast('License removed from resale!', 'success');
      
      const modal = document.getElementById('licenseModal');
      modal.style.display = 'none';
      modal.classList.remove('active');
      
      await loadDashboard();
    }
  } catch (error) {
    showError('Error removing from resale: ' + error.message);
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
