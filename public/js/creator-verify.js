// Creator Verification JavaScript

const API_BASE = '/api';
let currentContentId = null;
let currentToken = null;
let verificationInterval = null;

// Step 1: Submit link
document.getElementById('submitLink')?.addEventListener('click', async () => {
  const creatorId = document.getElementById('creatorId').value;
  const sourceUrl = document.getElementById('sourceUrl').value;
  
  if (!creatorId || !sourceUrl) {
    showError('Please fill in all fields');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/verify/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: creatorId, sourceUrl })
    });
    
    const result = await response.json();
    
    if (result.success) {
      currentContentId = result.data.contentId;
      currentToken = result.data.token;
      
      // Show step 2
      document.getElementById('step1').style.display = 'none';
      document.getElementById('step2').style.display = 'block';
      document.getElementById('verificationToken').textContent = currentToken;
      
      showSuccess('Token generated! Add it to your profile bio.');
    } else {
      showError(result.error || 'Failed to generate token');
    }
  } catch (error) {
    showError('Error: ' + error.message);
  }
});

// Copy token
document.getElementById('copyToken')?.addEventListener('click', () => {
  const token = document.getElementById('verificationToken').textContent;
  navigator.clipboard.writeText(token).then(() => {
    showSuccess('Token copied to clipboard!');
  });
});

// Verify now
document.getElementById('verifyNow')?.addEventListener('click', async () => {
  if (!currentContentId) {
    showError('No content to verify');
    return;
  }
  
  const statusDiv = document.getElementById('pollingStatus');
  statusDiv.textContent = 'Verifying... Please wait...';
  
  try {
    const response = await fetch(`${API_BASE}/verify/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId: currentContentId })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Show step 3
      document.getElementById('step2').style.display = 'none';
      document.getElementById('step3').style.display = 'block';
      
      const details = document.getElementById('successDetails');
      details.innerHTML = `
        <p><strong>Content ID:</strong> ${result.data.contentLink._id}</p>
        <p><strong>Platform:</strong> ${result.data.contentLink.platform}</p>
        <p><strong>Status:</strong> Active</p>
        <p><strong>Suggested Price:</strong> $${result.data.contentLink.aiPriceSuggested}</p>
        <p><strong>Vault Path:</strong> Content backed up successfully</p>
        <p class="help-text">Your content is now live in the marketplace!</p>
      `;
      
      showSuccess('Verification complete!');
    } else {
      statusDiv.textContent = result.error || 'Verification failed';
      showError(result.error || 'Verification failed. Make sure the token is in your bio.');
    }
  } catch (error) {
    statusDiv.textContent = 'Error: ' + error.message;
    showError('Error: ' + error.message);
  }
});

// Submit another
document.getElementById('submitAnother')?.addEventListener('click', () => {
  document.getElementById('step3').style.display = 'none';
  document.getElementById('step1').style.display = 'block';
  document.getElementById('creatorId').value = '';
  document.getElementById('sourceUrl').value = '';
  currentContentId = null;
  currentToken = null;
});

// Load my content
document.getElementById('loadMyContent')?.addEventListener('click', async () => {
  const creatorId = document.getElementById('myCreatorId').value;
  
  if (!creatorId) {
    showError('Please enter your User ID');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/users/${creatorId}/content`);
    const result = await response.json();
    
    if (result.success) {
      displayMyContent(result.data);
    } else {
      showError(result.error || 'Failed to load content');
    }
  } catch (error) {
    showError('Error: ' + error.message);
  }
});

// Display my content
function displayMyContent(contentLinks) {
  const list = document.getElementById('myContentList');
  
  if (contentLinks.length === 0) {
    list.innerHTML = '<p class="help-text">No content found</p>';
    return;
  }
  
  list.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Platform</th>
          <th>URL</th>
          <th>Status</th>
          <th>Price</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        ${contentLinks.map(content => `
          <tr>
            <td>${content.platform}</td>
            <td>${truncateText(content.sourceUrl, 40)}</td>
            <td><span class="status-badge ${content.status.toLowerCase()}">${content.status}</span></td>
            <td>$${content.currentPrice}</td>
            <td>${formatDate(content.createdAt)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Create account link handler
document.querySelector('a[href="#createAccount"]')?.addEventListener('click', async (e) => {
  e.preventDefault();
  const username = prompt('Enter username:');
  const email = prompt('Enter email:');
  
  if (username && email) {
    try {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, role: 'Creator' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        showSuccess('Account created! Your User ID: ' + result.data._id);
        document.getElementById('creatorId').value = result.data._id;
      } else {
        showError(result.error || 'Failed to create account');
      }
    } catch (error) {
      showError('Error: ' + error.message);
    }
  }
});

// Utility functions
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
