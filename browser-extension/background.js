// Background service worker for DukuAI extension

chrome.runtime.onInstalled.addListener(() => {
  // Create context menu items
  chrome.contextMenus.create({
    id: 'dukuai-capture-viewport',
    title: 'Capture viewport with DukuAI',
    contexts: ['page']
  });
  
  chrome.contextMenus.create({
    id: 'dukuai-capture-fullpage',
    title: 'Capture full page with DukuAI',
    contexts: ['page']
  });
  
  chrome.contextMenus.create({
    id: 'dukuai-capture-element',
    title: 'Capture element with DukuAI',
    contexts: ['all']
  });
  
  chrome.contextMenus.create({
    id: 'dukuai-separator',
    type: 'separator',
    contexts: ['page']
  });
  
  chrome.contextMenus.create({
    id: 'dukuai-open-tool',
    title: 'Open DukuAI comparison tool',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case 'dukuai-capture-viewport':
      await captureViewport(tab);
      break;
      
    case 'dukuai-capture-fullpage':
      await captureFullPage(tab);
      break;
      
    case 'dukuai-capture-element':
      await startElementCapture(tab);
      break;
      
    case 'dukuai-open-tool':
      chrome.tabs.create({ url: 'http://localhost:3000/tech' });
      break;
  }
});

async function captureViewport(tab) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    await saveCapture({
      id: crypto.randomUUID(),
      dataUrl,
      type: 'viewport',
      url: tab.url,
      timestamp: Date.now()
    });
    
    showNotification('Viewport captured!', 'DukuAI has captured the current viewport.');
  } catch (error) {
    console.error('Error capturing viewport:', error);
    showNotification('Capture failed', 'Failed to capture viewport: ' + error.message);
  }
}

async function captureFullPage(tab) {
  try {
    showNotification('Capturing...', 'Capturing full page, please wait...');
    
    // Send message to content script to handle full page capture
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'captureFullPage' });
    
    if (result && result.success) {
      await saveCapture({
        id: crypto.randomUUID(),
        dataUrl: result.dataUrl,
        type: 'fullpage',
        url: tab.url,
        timestamp: Date.now()
      });
      
      showNotification('Full page captured!', 'DukuAI has captured the entire page.');
    } else {
      throw new Error(result?.error || 'Failed to capture full page');
    }
  } catch (error) {
    console.error('Error capturing full page:', error);
    showNotification('Capture failed', 'Failed to capture full page. Try refreshing the page first.');
  }
}

async function startElementCapture(tab) {
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'startElementSelector' });
    if (result && result.success) {
      showNotification('Element selector activated', 'Click on any element to capture it. Press ESC to cancel.');
    }
  } catch (error) {
    console.error('Error starting element capture:', error);
    showNotification('Capture failed', 'Failed to start element capture. Try refreshing the page first.');
  }
}

async function saveCapture(capture) {
  const { captures = [] } = await chrome.storage.local.get(['captures']);
  captures.unshift(capture);
  
  if (captures.length > 50) {
    captures.splice(50);
  }
  
  await chrome.storage.local.set({ captures });
}

function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: title,
    message: message
  });
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  switch (message.type) {
    case 'elementCaptured':
      await saveCapture({
        id: crypto.randomUUID(),
        dataUrl: message.dataUrl,
        type: 'element',
        url: message.url,
        timestamp: Date.now(),
        element: message.element
      });
      
      showNotification('Element captured!', 'DukuAI has captured the selected element.');
      break;
      
    case 'getCaptures':
      const { captures = [] } = await chrome.storage.local.get(['captures']);
      sendResponse(captures);
      break;
      
    case 'captureVisibleTab':
      try {
        const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' });
        sendResponse(dataUrl);
      } catch (error) {
        console.error('Error capturing visible tab:', error);
        sendResponse(null);
      }
      break;
  }
  
  // Return true to indicate we'll send a response asynchronously
  return true;
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This will open the popup, which is handled by the manifest
});