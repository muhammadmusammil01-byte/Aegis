// Consumer Certificate JavaScript

const { apiCall } = window.aegisAuth;

async function loadCertificates() {
  try {
    const response = await apiCall('/consumer/library');
    
    if (response.success) {
      displayCertificates(response.data);
    }
  } catch (error) {
    showError('Error loading certificates: ' + error.message);
  }
}

function displayCertificates(licenses) {
  const grid = document.getElementById('certificatesList');
  
  if (licenses.length === 0) {
    grid.innerHTML = '<p class="loading">No certificates yet</p>';
    return;
  }
  
  grid.innerHTML = licenses.map(license => `
    <div class="certificate-card">
      <div class="cert-icon">📜</div>
      <h3>${truncate(license.contentId?.metadata?.title || 'Usage Rights', 30)}</h3>
      <p><strong>License ID:</strong> ${license.licenseId}</p>
      <p><strong>Platform:</strong> ${license.contentId?.platform}</p>
      <p><strong>Issued:</strong> ${formatDate(license.purchasedAt)}</p>
      <button class="btn btn-primary btn-small view-cert-btn" data-license-id="${license.licenseId}">
        View Certificate
      </button>
    </div>
  `).join('');
  
  document.querySelectorAll('.view-cert-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await viewCertificate(btn.dataset.licenseId);
    });
  });
}

async function viewCertificate(licenseId) {
  try {
    const response = await apiCall(`/transactions/certificate/${licenseId}`);
    
    if (response.success) {
      const cert = response.data;
      
      const viewer = document.getElementById('certViewer');
      viewer.innerHTML = `
        <div class="certificate-display">
          <h3>AEGIS USAGE LICENSE</h3>
          <p><strong>License ID:</strong> ${cert.licenseId}</p>
          <p><strong>Issued:</strong> ${formatDate(cert.issuedAt)}</p>
          <hr>
          <h4>Licensed To</h4>
          <p>${cert.buyer.username} (${cert.buyer.email})</p>
          <hr>
          <h4>Licensed Content</h4>
          <p><strong>Platform:</strong> ${cert.content.platform}</p>
          <p><strong>URL:</strong> <a href="${cert.content.sourceUrl}" target="_blank">${cert.content.sourceUrl}</a></p>
          <hr>
          <h4>Rights Granted</h4>
          <ul>
            ${cert.rightsGranted.map(right => `<li>${right}</li>`).join('')}
          </ul>
          <hr>
          <p><strong>Signature:</strong> <code>${cert.signature}</code></p>
        </div>
      `;
      
      const modal = document.getElementById('certModal');
      modal.style.display = 'flex';
      modal.classList.add('active');
      
      document.getElementById('downloadJSON').onclick = () => {
        const dataStr = JSON.stringify(cert, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', `certificate_${licenseId}.json`);
        link.click();
        showToast('Certificate downloaded!', 'success');
      };
    }
  } catch (error) {
    showError('Error loading certificate: ' + error.message);
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

loadCertificates();
