// Creator Catalog JavaScript

const { apiCall, requireRole } = window.aegisAuth;

if (!requireRole('Creator')) {
  throw new Error('Creator access required');
}

let currentContentId = null;

async function loadCatalog() {
  try {
    const response = await apiCall('/creator/catalog');
    
    if (response.success) {
      displayCatalog(response.data);
    }
  } catch (error) {
    showError('Error loading catalog: ' + error.message);
  }
}

function displayCatalog(catalog) {
  const tbody = document.getElementById('catalogTable');
  
  if (catalog.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9">No content yet. <a href="/creator-verify.html">Submit your first content</a></td></tr>';
    return;
  }
  
  tbody.innerHTML = catalog.map(item => `
    <tr>
      <td>${item.platform}</td>
      <td><a href="${item.sourceUrl}" target="_blank">${truncate(item.metadata?.title || item.sourceUrl, 40)}</a></td>
      <td><span class="status-badge ${item.status.toLowerCase()}">${item.status}</span></td>
      <td>${formatCurrency(item.currentPrice)}</td>
      <td>${formatCurrency(item.aiPriceSuggested)}</td>
      <td>${item.licensesSold}</td>
      <td>${formatCurrency(item.revenue)}</td>
      <td>${formatDate(item.createdAt)}</td>
      <td>
        <button class="btn btn-small btn-secondary edit-price-btn" data-id="${item._id}" data-price="${item.currentPrice}" data-title="${item.metadata?.title || 'Content'}">
          Edit Price
        </button>
      </td>
    </tr>
  `).join('');
  
  // Add click handlers
  document.querySelectorAll('.edit-price-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openPriceModal(btn.dataset.id, btn.dataset.title, btn.dataset.price);
    });
  });
}

function openPriceModal(contentId, title, currentPrice) {
  currentContentId = contentId;
  
  const modal = document.getElementById('priceModal');
  const details = document.getElementById('priceModalDetails');
  
  details.innerHTML = `
    <p><strong>Content:</strong> ${title}</p>
    <p><strong>Current Price:</strong> ${formatCurrency(currentPrice)}</p>
  `;
  
  document.getElementById('newPrice').value = currentPrice;
  
  modal.style.display = 'flex';
  modal.classList.add('active');
}

document.getElementById('confirmPrice')?.addEventListener('click', async () => {
  const newPrice = parseFloat(document.getElementById('newPrice').value);
  
  if (!newPrice || newPrice < 0) {
    showError('Please enter a valid price');
    return;
  }
  
  try {
    const response = await apiCall(`/creator/catalog/${currentContentId}/price`, {
      method: 'PUT',
      body: JSON.stringify({ price: newPrice })
    });
    
    if (response.success) {
      showToast('Price updated successfully', 'success');
      
      const modal = document.getElementById('priceModal');
      modal.style.display = 'none';
      modal.classList.remove('active');
      
      loadCatalog();
    }
  } catch (error) {
    showError('Error updating price: ' + error.message);
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

loadCatalog();
