// Distributor Queue JavaScript

const { apiCall, requireRole } = window.aegisAuth;

if (!requireRole('Distributor')) {
  throw new Error('Distributor access required');
}

let currentContentId = null;
let currentPage = 1;

async function loadStats() {
  try {
    const response = await apiCall('/distributor/stats');
    
    if (response.success) {
      const data = response.data;
      
      document.getElementById('pendingCount').textContent = data.pendingReview;
      document.getElementById('totalReviewed').textContent = data.totalReviewed;
      document.getElementById('approvedCount').textContent = data.approved;
      document.getElementById('approvalRate').textContent = data.approvalRate + '%';
    }
  } catch (error) {
    showError('Error loading stats: ' + error.message);
  }
}

async function loadQueue(page = 1) {
  try {
    const response = await apiCall(`/distributor/queue?page=${page}&limit=20`);
    
    if (response.success) {
      displayQueue(response.data.queue);
      displayPagination(response.data.pagination);
    }
  } catch (error) {
    showError('Error loading queue: ' + error.message);
  }
}

function displayQueue(queue) {
  const container = document.getElementById('reviewQueue');
  
  if (queue.length === 0) {
    container.innerHTML = '<p class="loading">No content pending review</p>';
    return;
  }
  
  container.innerHTML = queue.map(item => `
    <div class="content-card review-card">
      <div class="content-card-header">
        <span class="platform-badge">${item.platform}</span>
        <span class="status-badge pending">Pending Review</span>
      </div>
      <div class="content-card-body">
        <h3>${truncate(item.metadata?.title || 'Untitled Content', 50)}</h3>
        <p><strong>Creator:</strong> ${item.originalCreatorId?.username || 'Unknown'}</p>
        <p><strong>URL:</strong> <a href="${item.sourceUrl}" target="_blank">${truncate(item.sourceUrl, 60)}</a></p>
        <p><strong>AI Suggested Price:</strong> ${formatCurrency(item.aiPriceSuggested)}</p>
        <p><strong>Verified:</strong> ${formatDate(item.verifiedAt)}</p>
      </div>
      <div class="content-card-footer">
        <button class="btn btn-primary btn-small review-btn" data-id="${item._id}">
          Review
        </button>
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  document.querySelectorAll('.review-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await openReviewModal(btn.dataset.id);
    });
  });
}

async function openReviewModal(contentId) {
  currentContentId = contentId;
  
  try {
    const response = await apiCall(`/marketplace/${contentId}`);
    
    if (response.success) {
      const content = response.data;
      
      const details = document.getElementById('contentDetails');
      details.innerHTML = `
        <div class="success-details">
          <p><strong>Platform:</strong> ${content.platform}</p>
          <p><strong>Creator:</strong> ${content.originalCreatorId?.username} (${content.originalCreatorId?.email})</p>
          <p><strong>URL:</strong> <a href="${content.sourceUrl}" target="_blank">${content.sourceUrl}</a></p>
          <p><strong>AI Suggested Price:</strong> ${formatCurrency(content.aiPriceSuggested)}</p>
          ${content.metadata?.title ? `<p><strong>Title:</strong> ${content.metadata.title}</p>` : ''}
          ${content.metadata?.description ? `<p><strong>Description:</strong> ${content.metadata.description}</p>` : ''}
          <p><strong>Verified At:</strong> ${formatDate(content.verifiedAt)}</p>
        </div>
      `;
      
      document.getElementById('finalPrice').value = content.aiPriceSuggested;
      
      const modal = document.getElementById('actionModal');
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  } catch (error) {
    showError('Error loading content: ' + error.message);
  }
}

document.getElementById('approveBtn')?.addEventListener('click', async () => {
  const finalPrice = parseFloat(document.getElementById('finalPrice').value);
  
  try {
    const response = await apiCall(`/distributor/approve/${currentContentId}`, {
      method: 'POST',
      body: JSON.stringify({ finalPrice: finalPrice || null })
    });
    
    if (response.success) {
      showToast('Content approved and published!', 'success');
      
      const modal = document.getElementById('actionModal');
      modal.style.display = 'none';
      modal.classList.remove('active');
      
      await loadStats();
      await loadQueue(currentPage);
    }
  } catch (error) {
    showError('Error approving content: ' + error.message);
  }
});

document.getElementById('rejectBtn')?.addEventListener('click', async () => {
  if (!confirm('Are you sure you want to reject this content?')) return;
  
  try {
    const response = await apiCall(`/distributor/reject/${currentContentId}`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Quality standards not met' })
    });
    
    if (response.success) {
      showToast('Content rejected', 'success');
      
      const modal = document.getElementById('actionModal');
      modal.style.display = 'none';
      modal.classList.remove('active');
      
      await loadStats();
      await loadQueue(currentPage);
    }
  } catch (error) {
    showError('Error rejecting content: ' + error.message);
  }
});

function displayPagination(pagination) {
  const paginationDiv = document.getElementById('pagination');
  
  let html = '';
  
  if (pagination.page > 1) {
    html += `<button onclick="loadQueue(${pagination.page - 1})">Previous</button>`;
  }
  
  for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.pages, pagination.page + 2); i++) {
    html += `<button class="${i === pagination.page ? 'active' : ''}" onclick="loadQueue(${i})">${i}</button>`;
  }
  
  if (pagination.page < pagination.pages) {
    html += `<button onclick="loadQueue(${pagination.page + 1})">Next</button>`;
  }
  
  paginationDiv.innerHTML = html;
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

loadStats();
loadQueue();

// Make loadQueue available globally for pagination
window.loadQueue = loadQueue;
