// Auth and Role-Based Navigation

const API_BASE = '/api';
let currentUser = null;

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  setupLogout();
});

/**
 * Check authentication and load user profile
 */
async function checkAuth() {
  const userId = localStorage.getItem('aegis_user_id');
  
  if (!userId) {
    // Redirect to login if not authenticated
    if (!window.location.pathname.includes('index.html') && 
        window.location.pathname !== '/' &&
        !window.location.pathname.includes('marketplace.html') &&
        !window.location.pathname.includes('creator-verify.html')) {
      // For now, just prompt for user ID
      promptLogin();
    }
    return null;
  }
  
  try {
    const response = await fetch(`${API_BASE}/auth/me?userId=${userId}`, {
      headers: {
        'X-User-ID': userId
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      currentUser = result.data;
      updateNavigation(currentUser.role);
      updateWelcomeMessage(currentUser.username, currentUser.role);
      return currentUser;
    } else {
      localStorage.removeItem('aegis_user_id');
      promptLogin();
    }
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

/**
 * Prompt for user login
 */
function promptLogin() {
  const userId = prompt('Enter your User ID to continue:');
  if (userId) {
    localStorage.setItem('aegis_user_id', userId);
    window.location.reload();
  } else {
    window.location.href = '/';
  }
}

/**
 * Update navigation based on user role
 */
function updateNavigation(role) {
  const navLinks = document.getElementById('navLinks');
  if (!navLinks) return;
  
  // Remove all role-specific links except logout
  const links = navLinks.querySelectorAll('a:not(#logoutLink)');
  links.forEach(link => {
    const href = link.getAttribute('href');
    
    // Check if link is allowed for this role
    const isAllowed = checkLinkAccess(href, role);
    
    if (!isAllowed) {
      link.remove();
    }
  });
}

/**
 * Check if user role has access to a link
 */
function checkLinkAccess(href, role) {
  // Public pages - accessible to all
  const publicPages = ['/', '/index.html', '/marketplace.html'];
  if (publicPages.includes(href)) return true;
  
  // Admin pages
  if (href.startsWith('/admin-')) {
    return role === 'Admin';
  }
  
  // Creator pages
  if (href.startsWith('/creator-')) {
    return role === 'Creator' || role === 'Admin';
  }
  
  // Distributor pages
  if (href.startsWith('/distributor-')) {
    return role === 'Distributor' || role === 'Admin';
  }
  
  // Consumer pages (all authenticated users can access)
  if (href.startsWith('/consumer-')) {
    return true; // All roles can have consumer features
  }
  
  return true;
}

/**
 * Update welcome message
 */
function updateWelcomeMessage(username, role) {
  const welcomeMsg = document.getElementById('welcomeMessage');
  if (welcomeMsg) {
    welcomeMsg.textContent = `Welcome, ${username} (${role})`;
  }
}

/**
 * Setup logout functionality
 */
function setupLogout() {
  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('aegis_user_id');
      currentUser = null;
      showToast('Logged out successfully', 'success');
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    });
  }
}

/**
 * Get current user
 */
function getCurrentUser() {
  return currentUser;
}

/**
 * Get user ID from storage
 */
function getUserId() {
  return localStorage.getItem('aegis_user_id');
}

/**
 * Make authenticated API call
 */
async function apiCall(endpoint, options = {}) {
  const userId = getUserId();
  
  if (!userId) {
    throw new Error('Not authenticated');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'X-User-ID': userId,
    ...(options.headers || {})
  };
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });
  
  const result = await response.json();
  
  if (response.status === 401 || response.status === 403) {
    showToast(result.error || 'Access denied', 'error');
    if (response.status === 401) {
      localStorage.removeItem('aegis_user_id');
      setTimeout(() => window.location.href = '/', 2000);
    }
    throw new Error(result.error);
  }
  
  return result;
}

/**
 * Check if user has required role
 */
function requireRole(...roles) {
  if (!currentUser) {
    showToast('Please log in', 'error');
    window.location.href = '/';
    return false;
  }
  
  if (!roles.includes(currentUser.role)) {
    showToast('Access denied. Insufficient permissions.', 'error');
    window.location.href = '/';
    return false;
  }
  
  return true;
}

/**
 * Toast notification
 */
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
    animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Export functions for use in other scripts
window.aegisAuth = {
  getCurrentUser,
  getUserId,
  apiCall,
  requireRole,
  checkAuth
};
