// Marketplace JavaScript

const API_BASE = '/api';
let currentPage = 1;
let currentFilters = {};

// Load marketplace content
async function loadMarketplace(page = 1) {
  try {
    const params = new URLSearchParams({
      page,
      limit: 20,
      ...currentFilters
    });

    const response = await fetch(`${API_BASE}/marketplace?${params}`);
    const result = await response.json();

    if (result.success) {
      displayContent(result.data.contentLinks);
      displayPagination(result.data.pagination);
    } else {
      showError('Failed to load marketplace');
    }
  } catch (error) {
    showError('Error loading marketplace: ' + error.message);
  }
}

// Display content cards
function displayContent(contentLinks) {
  const grid = document.getElementById('marketplaceGrid');
  
  if (contentLinks.length === 0) {
    grid.innerHTML = '<div class="loading">No content available</div>';
    return;
  }

  grid.innerHTML = contentLinks.map(content => `
    <div class="content-card" data-id="${content._id}">
      <div class="content-card-header">
        <span class="platform-badge">${getPlatformIcon(content.platform)} ${content.platform}</span>
      </div>
      <div class="content-card-body">
        <h3>${truncateText(content.metadata?.title || 'Untitled Content', 40)}</h3>
        <p>${truncateText(content.metadata?.description || 'No description', 80)}</p>
        <p><small>By: ${content.originalCreatorId?.username || 'Unknown'}</small></p>
        <p><small>Listed: ${formatDate(content.createdAt)}</small></p>
      </div>
      <div class="content-card-footer">
        <span class="price">${formatCurrency(content.currentPrice)}</span>
        <button class="btn btn-primary btn-small purchase-btn" data-id="${content._id}" data-price="${content.currentPrice}">
          Purchase
        </button>
      </div>
    </div>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.purchase-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openPurchaseModal(btn.dataset.id, btn.dataset.price);
    });
  });
}

// Display pagination
function displayPagination(pagination) {
  const paginationDiv = document.getElementById('pagination');
  
  let html = '';
  
  if (pagination.page > 1) {
    html += `<button onclick="loadMarketplace(${pagination.page - 1})">Previous</button>`;
  }
  
  for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.pages, pagination.page + 2); i++) {
    html += `<button class="${i === pagination.page ? 'active' : ''}" onclick="loadMarketplace(${i})">${i}</button>`;
  }
  
  if (pagination.page < pagination.pages) {
    html += `<button onclick="loadMarketplace(${pagination.page + 1})">Next</button>`;
  }
  
  paginationDiv.innerHTML = html;
}

// Open purchase modal
function openPurchaseModal(contentId, price) {
  const modal = document.getElementById('purchaseModal');
  const details = document.getElementById('modalDetails');
  
  details.innerHTML = `
    <p>Content ID: ${contentId}</p>
    <p>Price: ${formatCurrency(price)}</p>
    <p class="help-text">You will receive a digital rights certificate after purchase.</p>
  `;
  
  modal.style.display = 'flex';
  modal.classList.add('active');
  
  // Store for purchase confirmation
  modal.dataset.contentId = contentId;
}

// Apply filters
document.getElementById('applyFilters')?.addEventListener('click', () => {
  const platform = document.getElementById('platformFilter').value;
  const minPrice = document.getElementById('minPrice').value;
  const maxPrice = document.getElementById('maxPrice').value;
  
  currentFilters = {};
  if (platform) currentFilters.platform = platform;
  if (minPrice) currentFilters.minPrice = minPrice;
  if (maxPrice) currentFilters.maxPrice = maxPrice;
  
  loadMarketplace(1);
});

// View resales
document.getElementById('viewResales')?.addEventListener('click', async () => {
  try {
    const response = await fetch(`${API_BASE}/marketplace/resale`);
    const result = await response.json();
    
    if (result.success) {
      displayResaleContent(result.data.licenses);
    }
  } catch (error) {
    showError('Error loading resale market: ' + error.message);
  }
});

// Display resale content
function displayResaleContent(licenses) {
  const grid = document.getElementById('marketplaceGrid');
  
  if (licenses.length === 0) {
    grid.innerHTML = '<div class="loading">No resale licenses available</div>';
    return;
  }

  grid.innerHTML = licenses.map(license => `
    <div class="content-card" data-id="${license._id}">
      <div class="content-card-header">
        <span class="platform-badge">${getPlatformIcon(license.contentId.platform)} ${license.contentId.platform}</span>
        <span class="resale-badge">RESALE</span>
      </div>
      <div class="content-card-body">
        <h3>${truncateText(license.contentId.metadata?.title || 'Untitled Content', 40)}</h3>
        <p><small>Seller: ${license.buyerId?.username || 'Unknown'}</small></p>
        <p><small>Original Price: ${formatCurrency(license.purchasePrice)}</small></p>
      </div>
      <div class="content-card-footer">
        <span class="price">${formatCurrency(license.resalePrice)}</span>
        <button class="btn btn-primary btn-small resale-purchase-btn" 
                data-content-id="${license.contentId._id}" 
                data-seller-id="${license.buyerId._id}"
                data-price="${license.resalePrice}">
          Purchase
        </button>
      </div>
    </div>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.resale-purchase-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openResalePurchaseModal(btn.dataset.contentId, btn.dataset.sellerId, btn.dataset.price);
    });
  });
}

// Open resale purchase modal
function openResalePurchaseModal(contentId, sellerId, price) {
  const modal = document.getElementById('purchaseModal');
  const details = document.getElementById('modalDetails');
  
  details.innerHTML = `
    <p>Content ID: ${contentId}</p>
    <p>Price: ${formatCurrency(price)}</p>
    <p class="help-text">This is a resale. 10% royalty goes to original creator.</p>
  `;
  
  modal.style.display = 'flex';
  modal.classList.add('active');
  
  modal.dataset.contentId = contentId;
  modal.dataset.sellerId = sellerId;
}

// Confirm purchase
document.getElementById('confirmPurchase')?.addEventListener('click', async () => {
  const modal = document.getElementById('purchaseModal');
  const buyerId = document.getElementById('buyerIdInput').value;
  const contentId = modal.dataset.contentId;
  const sellerId = modal.dataset.sellerId;
  
  if (!buyerId) {
    showError('Please enter your User ID');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/transactions/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyerId,
        contentId,
        sellerId: sellerId || undefined
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess('Purchase successful! License ID: ' + result.data.licenseId);
      modal.style.display = 'none';
      modal.classList.remove('active');
      document.getElementById('buyerIdInput').value = '';
    } else {
      showError(result.error || 'Purchase failed');
    }
  } catch (error) {
    showError('Error processing purchase: ' + error.message);
  }
});

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
function getPlatformIcon(platform) {
  const icons = {
    'Instagram': '📷',
    'YouTube': '📺',
    'TikTok': '🎵',
    'Twitter': '🐦',
    'Facebook': '👥'
  };
  return icons[platform] || '🔗';
}

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
loadMarketplace();
