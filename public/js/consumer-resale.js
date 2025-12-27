// Consumer Resale JavaScript

const { apiCall } = window.aegisAuth;

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
  });
});

async function loadResales() {
  try {
    const [available, myLicenses] = await Promise.all([
      apiCall('/marketplace/resale'),
      apiCall('/consumer/library')
    ]);
    
    if (available.success) {
      displayAvailableResales(available.data.licenses);
    }
    
    if (myLicenses.success) {
      const myListings = myLicenses.data.filter(l => l.isForResale);
      displayMyListings(myListings);
    }
  } catch (error) {
    showError('Error loading resales: ' + error.message);
  }
}

function displayAvailableResales(licenses) {
  const grid = document.getElementById('availableResales');
  
  if (licenses.length === 0) {
    grid.innerHTML = '<p class="loading">No resales available</p>';
    return;
  }
  
  grid.innerHTML = licenses.map(license => `
    <div class="content-card">
      <div class="content-card-header">
        <span class="platform-badge">${license.contentId?.platform}</span>
        <span class="resale-badge">RESALE</span>
      </div>
      <div class="content-card-body">
        <h3>${truncate(license.contentId?.metadata?.title || 'Content', 30)}</h3>
        <p><strong>Seller:</strong> ${license.buyerId?.username}</p>
        <p><strong>Original Price:</strong> ${formatCurrency(license.purchasePrice)}</p>
        <p class="help-text">10% royalty goes to original creator</p>
      </div>
      <div class="content-card-footer">
        <span class="price">${formatCurrency(license.resalePrice)}</span>
        <button class="btn btn-primary btn-small">Purchase</button>
      </div>
    </div>
  `).join('');
}

function displayMyListings(listings) {
  const grid = document.getElementById('myListings');
  
  if (listings.length === 0) {
    grid.innerHTML = '<p class="loading">No active listings. <a href="/consumer-library.html">List a license for resale</a></p>';
    return;
  }
  
  grid.innerHTML = listings.map(license => `
    <div class="content-card">
      <div class="content-card-header">
        <span class="platform-badge">${license.contentId?.platform}</span>
        <span class="resale-badge">YOUR LISTING</span>
      </div>
      <div class="content-card-body">
        <h3>${truncate(license.contentId?.metadata?.title || 'Content', 30)}</h3>
        <p><strong>License ID:</strong> ${license.licenseId}</p>
        <p><strong>Purchase Price:</strong> ${formatCurrency(license.purchasePrice)}</p>
        <p><strong>Listed At:</strong> ${formatCurrency(license.resalePrice)}</p>
      </div>
      <div class="content-card-footer">
        <button class="btn btn-secondary btn-small delist-btn" data-license-id="${license.licenseId}">
          Delist
        </button>
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll('.delist-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await removeFromResale(btn.dataset.licenseId);
    });
  });
}

async function removeFromResale(licenseId) {
  try {
    const response = await apiCall('/transactions/resale/remove', {
      method: 'POST',
      body: JSON.stringify({ licenseId })
    });
    
    if (response.success) {
      showToast('License delisted', 'success');
      await loadResales();
    }
  } catch (error) {
    showError('Error delisting: ' + error.message);
  }
}

function formatCurrency(amount) {
  return `$${parseFloat(amount || 0).toFixed(2)}`;
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

loadResales();
