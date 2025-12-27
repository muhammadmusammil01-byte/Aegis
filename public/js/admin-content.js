// Admin Links JavaScript

const API_BASE = '/api';
let currentPage = 1;
let currentFilters = {};
let editingContentId = null;

// Load content
async function loadContent(page = 1) {
  try {
    const params = new URLSearchParams({
      page,
      limit: 50,
      ...currentFilters
    });

    const response = await fetch(`${API_BASE}/admin/content?${params}`);
    const result = await response.json();

    if (result.success) {
      displayContent(result.data.contentLinks);
      displayPagination(result.data.pagination);
    } else {
      showError('Failed to load content');
    }
  } catch (error) {
    showError('Error loading content: ' + error.message);
  }
}

// Display content table
function displayContent(contentLinks) {
  const tbody = document.getElementById('contentTableBody');
  
  if (contentLinks.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading">No content found</td></tr>';
    return;
  }
  
  tbody.innerHTML = contentLinks.map(content => `
    <tr>
      <td>${truncateText(content._id, 10)}</td>
      <td>${content.platform}</td>
      <td>${content.originalCreatorId?.username || 'Unknown'}</td>
      <td><a href="${content.sourceUrl}" target="_blank">${truncateText(content.sourceUrl, 30)}</a></td>
      <td><span class="status-badge ${content.status.toLowerCase()}">${content.status}</span></td>
      <td>${formatCurrency(content.currentPrice)}</td>
      <td>${formatDate(content.createdAt)}</td>
      <td>
        <button class="btn btn-secondary action-btn view-content-btn" data-content-id="${content._id}">Manage</button>
      </td>
    </tr>
  `).join('');
  
  // Add click handlers
  document.querySelectorAll('.view-content-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const contentId = btn.dataset.contentId;
      await loadContentForModeration(contentId);
    });
  });
}

// Display pagination
function displayPagination(pagination) {
  const paginationDiv = document.getElementById('contentPagination');
  
  let html = '';
  
  if (pagination.page > 1) {
    html += `<button onclick="loadContent(${pagination.page - 1})">Previous</button>`;
  }
  
  for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.pages, pagination.page + 2); i++) {
    html += `<button class="${i === pagination.page ? 'active' : ''}" onclick="loadContent(${i})">${i}</button>`;
  }
  
  if (pagination.page < pagination.pages) {
    html += `<button onclick="loadContent(${pagination.page + 1})">Next</button>`;
  }
  
  paginationDiv.innerHTML = html;
}

// Apply filters
document.getElementById('applyContentFilters')?.addEventListener('click', () => {
  const status = document.getElementById('statusFilter').value;
  const platform = document.getElementById('platformFilter').value;
  
  currentFilters = {};
  if (status) currentFilters.status = status;
  if (platform) currentFilters.platform = platform;
  
  loadContent(1);
});

// Load content for moderation
async function loadContentForModeration(contentId) {
  try {
    const response = await fetch(`${API_BASE}/marketplace/${contentId}`);
    const result = await response.json();
    
    if (result.success) {
      const content = result.data;
      editingContentId = contentId;
      
      const details = document.getElementById('contentDetails');
      details.innerHTML = `
        <div class="success-details">
          <p><strong>Content ID:</strong> ${content._id}</p>
          <p><strong>Platform:</strong> ${content.platform}</p>
          <p><strong>Creator:</strong> ${content.originalCreatorId?.username || 'Unknown'} (${content.originalCreatorId?.email || 'N/A'})</p>
          <p><strong>Source URL:</strong> <a href="${content.sourceUrl}" target="_blank">${truncateText(content.sourceUrl, 60)}</a></p>
          <p><strong>Status:</strong> <span class="status-badge ${content.status.toLowerCase()}">${content.status}</span></p>
          <p><strong>Current Price:</strong> ${formatCurrency(content.currentPrice)}</p>
          <p><strong>AI Suggested Price:</strong> ${formatCurrency(content.aiPriceSuggested)}</p>
          <p><strong>Verification Token:</strong> ${content.verificationToken || 'N/A'}</p>
          <p><strong>Verified At:</strong> ${content.verifiedAt ? formatDate(content.verifiedAt) : 'Not verified'}</p>
          <p><strong>Vault Path:</strong> ${content.vaultPath || 'Not snapshotted'}</p>
          <p><strong>Created:</strong> ${formatDate(content.createdAt)}</p>
        </div>
        ${content.metadata ? `
          <div class="instructions">
            <h3>Metadata</h3>
            <p><strong>Title:</strong> ${content.metadata.title || 'N/A'}</p>
            <p><strong>Description:</strong> ${content.metadata.description || 'N/A'}</p>
            ${content.metadata.thumbnailUrl ? `<p><strong>Thumbnail:</strong> <img src="${content.metadata.thumbnailUrl}" style="max-width: 200px; border-radius: 4px;" /></p>` : ''}
          </div>
        ` : ''}
      `;
      
      const modal = document.getElementById('contentModal');
      modal.style.display = 'flex';
      modal.classList.add('active');
    } else {
      showError(result.error || 'Failed to load content');
    }
  } catch (error) {
    showError('Error: ' + error.message);
  }
}

// Status update buttons
document.querySelectorAll('.status-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!editingContentId) return;
    
    const status = btn.dataset.status;
    
    try {
      const response = await fetch(`${API_BASE}/admin/content/${editingContentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      const result = await response.json();
      
      if (result.success) {
        showSuccess(`Content status updated to ${status}!`);
        
        const modal = document.getElementById('contentModal');
        modal.style.display = 'none';
        modal.classList.remove('active');
        
        editingContentId = null;
        loadContent(currentPage);
      } else {
        showError(result.error || 'Failed to update status');
      }
    } catch (error) {
      showError('Error: ' + error.message);
    }
  });
});

// Delete button
document.querySelector('.delete-btn')?.addEventListener('click', async () => {
  if (!editingContentId) return;
  
  if (!confirm('Are you sure you want to permanently delete this content? This action cannot be undone.')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/admin/content/${editingContentId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess('Content deleted successfully!');
      
      const modal = document.getElementById('contentModal');
      modal.style.display = 'none';
      modal.classList.remove('active');
      
      editingContentId = null;
      loadContent(currentPage);
    } else {
      showError(result.error || 'Failed to delete content');
    }
  } catch (error) {
    showError('Error: ' + error.message);
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
function formatCurrency(amount) {
  return `$${parseFloat(amount).toFixed(2)}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
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
loadContent();
