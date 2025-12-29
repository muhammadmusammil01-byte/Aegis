/**
 * Content Shield - Anti-Theft Protection System
 * Implements: Right-click disable, Copy-paste prevention, Dynamic watermarking
 */

(function() {
  'use strict';
  
  // Configuration
  const CONFIG = {
    watermarkOpacity: 0.15,
    watermarkRotation: -45,
    watermarkFontSize: '16px',
    watermarkRepeat: true,
    watermarkUpdateInterval: 5000, // 5 seconds
    enableRightClickBlock: true,
    enableCopyPasteBlock: true,
    enableKeyboardShortcuts: true,
    enableDevToolsDetection: true,
    enableScreenshotDetection: true
  };
  
  // User information for watermark
  let userInfo = {
    email: 'anonymous@nexushub.com',
    ip: 'Unknown IP',
    timestamp: new Date().toISOString()
  };
  
  /**
   * Initialize Content Shield
   */
  function init() {
    console.log('🛡️ Content Shield: Initializing...');
    
    // Fetch user info from API
    fetchUserInfo();
    
    // Disable right-click
    if (CONFIG.enableRightClickBlock) {
      disableRightClick();
    }
    
    // Disable copy-paste
    if (CONFIG.enableCopyPasteBlock) {
      disableCopyPaste();
    }
    
    // Block keyboard shortcuts
    if (CONFIG.enableKeyboardShortcuts) {
      blockKeyboardShortcuts();
    }
    
    // Apply watermark
    applyWatermark();
    
    // Detect DevTools
    if (CONFIG.enableDevToolsDetection) {
      detectDevTools();
    }
    
    // Detect screenshot attempts
    if (CONFIG.enableScreenshotDetection) {
      detectScreenshots();
    }
    
    // Protect text selection
    protectTextSelection();
    
    // Disable drag and drop
    disableDragDrop();
    
    console.log('🛡️ Content Shield: Active');
  }
  
  /**
   * Fetch user info from backend
   */
  async function fetchUserInfo() {
    try {
      const token = localStorage.getItem('nexushub_token');
      
      if (token) {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          userInfo.email = data.user.email;
        }
      }
      
      // Get IP from backend (more secure than external API)
      // The watermark will be updated by the backend when fetching project details
      userInfo.ip = 'Fetching from server...';
      
      // Update watermark with user info
      updateWatermark();
      
    } catch (error) {
      console.warn('Content Shield: Could not fetch user info');
    }
  }
  
  /**
   * Disable right-click context menu
   */
  function disableRightClick() {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showWarning('Right-click is disabled for content protection');
      return false;
    }, false);
  }
  
  /**
   * Disable copy and paste operations
   */
  function disableCopyPaste() {
    // Disable copy
    document.addEventListener('copy', (e) => {
      e.preventDefault();
      e.clipboardData.setData('text/plain', 
        '⚠️ Content protected by NexusHub Content Shield\n' +
        `Watermark: ${userInfo.email} | ${userInfo.ip}\n` +
        'Unauthorized copying is prohibited.'
      );
      showWarning('Content is protected. Copying disabled.');
      return false;
    }, false);
    
    // Disable cut
    document.addEventListener('cut', (e) => {
      e.preventDefault();
      showWarning('Content is protected. Cutting disabled.');
      return false;
    }, false);
    
    // Disable paste (optional)
    document.addEventListener('paste', (e) => {
      // Allow paste in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return true;
      }
      e.preventDefault();
      return false;
    }, false);
  }
  
  /**
   * Block dangerous keyboard shortcuts
   */
  function blockKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+C, Ctrl+X, Ctrl+A, Ctrl+S, Ctrl+P
      if ((e.ctrlKey || e.metaKey) && 
          ['c', 'x', 'a', 's', 'p', 'u'].includes(e.key.toLowerCase())) {
        
        // Allow Ctrl+A in input fields
        if (e.key.toLowerCase() === 'a' && 
            (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
          return true;
        }
        
        e.preventDefault();
        showWarning('Keyboard shortcut disabled for content protection');
        return false;
      }
      
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U (DevTools)
      if (e.key === 'F12' || 
          ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) ||
          ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u')) {
        e.preventDefault();
        showWarning('Developer tools are disabled');
        return false;
      }
      
      // PrintScreen
      if (e.key === 'PrintScreen') {
        showWarning('Screenshot detected - content is watermarked');
        logSecurityEvent('SCREENSHOT_ATTEMPT');
      }
    }, false);
  }
  
  /**
   * Apply dynamic watermark overlay
   */
  function applyWatermark() {
    // Remove existing watermark if any
    const existing = document.getElementById('content-shield-watermark');
    if (existing) {
      existing.remove();
    }
    
    // Create watermark container
    const watermark = document.createElement('div');
    watermark.id = 'content-shield-watermark';
    watermark.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 999999;
      opacity: ${CONFIG.watermarkOpacity};
      overflow: hidden;
    `;
    
    // Create watermark pattern
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    
    const ctx = canvas.getContext('2d');
    ctx.font = `${CONFIG.watermarkFontSize} Arial`;
    ctx.fillStyle = '#000000';
    ctx.rotate((CONFIG.watermarkRotation * Math.PI) / 180);
    
    const text = `${userInfo.email} | ${userInfo.ip}`;
    
    if (CONFIG.watermarkRepeat) {
      // Repeat pattern
      for (let y = -200; y < canvas.height + 200; y += 80) {
        for (let x = -200; x < canvas.width + 200; x += 300) {
          ctx.fillText(text, x, y);
        }
      }
    } else {
      ctx.fillText(text, 50, 100);
    }
    
    // Set background from canvas
    watermark.style.backgroundImage = `url(${canvas.toDataURL()})`;
    watermark.style.backgroundRepeat = 'repeat';
    
    document.body.appendChild(watermark);
    
    // Periodically update watermark
    setInterval(updateWatermark, CONFIG.watermarkUpdateInterval);
  }
  
  /**
   * Update watermark with current timestamp
   */
  function updateWatermark() {
    userInfo.timestamp = new Date().toISOString();
    applyWatermark();
  }
  
  /**
   * Protect text selection
   */
  function protectTextSelection() {
    document.addEventListener('selectstart', (e) => {
      // Allow selection in input fields
      if (e.target.tagName === 'INPUT' || 
          e.target.tagName === 'TEXTAREA' ||
          e.target.isContentEditable) {
        return true;
      }
      
      // Prevent selection of protected content
      if (e.target.closest('.protected-content')) {
        e.preventDefault();
        return false;
      }
    }, false);
  }
  
  /**
   * Disable drag and drop
   */
  function disableDragDrop() {
    document.addEventListener('dragstart', (e) => {
      e.preventDefault();
      return false;
    }, false);
  }
  
  /**
   * Detect DevTools opening
   */
  function detectDevTools() {
    const threshold = 160;
    let devtoolsOpen = false;
    
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if ((widthThreshold || heightThreshold) && !devtoolsOpen) {
        devtoolsOpen = true;
        logSecurityEvent('DEVTOOLS_OPENED');
        showWarning('Developer tools detected - all content is watermarked');
      } else if (!widthThreshold && !heightThreshold && devtoolsOpen) {
        devtoolsOpen = false;
      }
    };
    
    setInterval(checkDevTools, 1000);
  }
  
  /**
   * Detect screenshot attempts
   */
  function detectScreenshots() {
    // Detect when page visibility changes (might indicate screenshot)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        logSecurityEvent('PAGE_HIDDEN_POSSIBLE_SCREENSHOT');
      }
    });
    
    // Detect focus loss (might indicate screenshot tool)
    window.addEventListener('blur', () => {
      logSecurityEvent('WINDOW_BLUR_POSSIBLE_SCREENSHOT');
    });
  }
  
  /**
   * Show warning message to user
   */
  function showWarning(message) {
    // Check if warning already exists
    if (document.getElementById('content-shield-warning')) {
      return;
    }
    
    const warning = document.createElement('div');
    warning.id = 'content-shield-warning';
    warning.textContent = `🛡️ ${message}`;
    warning.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(255, 59, 48, 0.95);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      z-index: 1000000;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(warning);
    
    setTimeout(() => {
      warning.style.opacity = '0';
      warning.style.transition = 'opacity 0.5s';
      setTimeout(() => warning.remove(), 500);
    }, 3000);
  }
  
  /**
   * Log security events
   */
  function logSecurityEvent(eventType) {
    console.warn(`🛡️ Security Event: ${eventType}`);
    
    // Send to backend (optional)
    const token = localStorage.getItem('nexushub_token');
    if (token) {
      // Silently log security events without blocking or showing errors
      fetch('/api/security/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          event: eventType,
          userInfo,
          timestamp: new Date().toISOString(),
          page: window.location.pathname
        })
      }).catch(() => {
        // Silent fail - don't disrupt user experience
        // In production, implement this endpoint in routes
      });
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Add CSS animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
  
})();
