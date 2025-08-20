class DukuAIPopup {
  constructor() {
    this.workflow = {
      beforeImage: null,
      afterImage: null,
      step: 'ready' // ready, before, after, comparing
    };
    this.settings = {
      apiUrl: 'http://localhost:8000',
      sensitivity: 50,
      autoOpenResults: false
    };
    this.currentResult = null;
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.updateUI();
    await this.loadRecentCaptures();
  }

  async loadSettings() {
    const stored = await chrome.storage.local.get(['settings']);
    if (stored.settings) {
      this.settings = { ...this.settings, ...stored.settings };
    }
    this.updateSettingsUI();
  }

  async saveSettings() {
    await chrome.storage.local.set({ settings: this.settings });
  }

  updateSettingsUI() {
    document.getElementById('api-url').value = this.settings.apiUrl;
    document.getElementById('sensitivity').value = this.settings.sensitivity;
    document.getElementById('sensitivity-value').textContent = this.settings.sensitivity;
    document.getElementById('auto-open-results').checked = this.settings.autoOpenResults;
  }

  setupEventListeners() {
    // Capture buttons
    document.getElementById('capture-viewport').addEventListener('click', () => {
      this.captureViewport();
    });

    document.getElementById('capture-fullpage').addEventListener('click', () => {
      this.captureFullPage();
    });

    document.getElementById('element-selector').addEventListener('click', () => {
      this.startElementSelector();
    });

    // Workflow buttons
    document.getElementById('compare-now').addEventListener('click', () => {
      this.compareImages();
    });

    document.getElementById('clear-workflow').addEventListener('click', () => {
      this.clearWorkflow();
    });

    // Results section buttons
    document.getElementById('close-results').addEventListener('click', () => {
      this.hideResults();
    });

    document.getElementById('view-full-results').addEventListener('click', () => {
      if (this.currentResult) {
        chrome.tabs.create({
          url: `http://localhost:3000/tech?comparison=${this.currentResult.id}`
        });
        if (!this.settings.autoOpenResults) {
          window.close(); // Close popup after opening results
        }
      }
    });

    document.getElementById('start-new-comparison').addEventListener('click', () => {
      this.hideResults();
      this.clearWorkflow();
    });

    // Settings
    document.getElementById('api-url').addEventListener('change', (e) => {
      this.settings.apiUrl = e.target.value;
      this.saveSettings();
    });

    document.getElementById('sensitivity').addEventListener('input', (e) => {
      this.settings.sensitivity = parseInt(e.target.value);
      document.getElementById('sensitivity-value').textContent = this.settings.sensitivity;
      this.saveSettings();
    });

    document.getElementById('auto-open-results').addEventListener('change', (e) => {
      this.settings.autoOpenResults = e.target.checked;
      this.saveSettings();
    });
  }

  async captureViewport() {
    try {
      this.setStatus('capturing', 'Capturing viewport...');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
      
      await this.handleCapture(dataUrl, 'viewport', tab.url);
      this.showMessage('Viewport captured successfully!', 'success');
    } catch (error) {
      console.error('Error capturing viewport:', error);
      this.showMessage('Failed to capture viewport: ' + error.message, 'error');
    } finally {
      this.setStatus('ready', this.getWorkflowStatusText());
    }
  }

  async captureFullPage() {
    try {
      this.setStatus('capturing', 'Capturing full page...');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send message to content script to capture full page
      const result = await chrome.tabs.sendMessage(tab.id, { type: 'captureFullPage' });
      
      if (result && result.success) {
        await this.handleCapture(result.dataUrl, 'fullpage', tab.url);
        this.showMessage('Full page captured successfully!', 'success');
      } else {
        throw new Error('Failed to capture full page');
      }
    } catch (error) {
      console.error('Error capturing full page:', error);
      this.showMessage('Failed to capture full page. Try refreshing the page first.', 'error');
    } finally {
      this.setStatus('ready', this.getWorkflowStatusText());
    }
  }

  async startElementSelector() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send message to content script to start element selector
      await chrome.tabs.sendMessage(tab.id, { type: 'startElementSelector' });
      
      this.showMessage('Click on any element to capture it', 'info');
      window.close(); // Close popup to allow element selection
    } catch (error) {
      console.error('Error starting element selector:', error);
      this.showMessage('Failed to start element selector. Try refreshing the page first.', 'error');
    }
  }

  async handleCapture(dataUrl, type, url) {
    const capture = {
      id: crypto.randomUUID(),
      dataUrl,
      type,
      url,
      timestamp: Date.now()
    };
    
    // Save to storage
    await this.saveCapture(capture);
    
    // Update workflow
    if (this.workflow.step === 'ready' || this.workflow.step === 'before') {
      this.workflow.beforeImage = capture;
      this.workflow.step = 'after';
    } else if (this.workflow.step === 'after') {
      this.workflow.afterImage = capture;
      this.workflow.step = 'ready-to-compare';
    }
    
    this.updateUI();
    await this.loadRecentCaptures();
  }

  async saveCapture(capture) {
    const { captures = [] } = await chrome.storage.local.get(['captures']);
    captures.unshift(capture);
    
    // Keep only last 20 captures
    if (captures.length > 20) {
      captures.splice(20);
    }
    
    await chrome.storage.local.set({ captures });
  }

  async loadRecentCaptures() {
    const { captures = [] } = await chrome.storage.local.get(['captures']);
    const captureList = document.getElementById('capture-list');
    
    if (captures.length === 0) {
      captureList.innerHTML = '<div style="color: #666; font-size: 12px; text-align: center; padding: 8px;">No captures yet</div>';
      return;
    }
    
    captureList.innerHTML = captures.map(capture => `
      <div class="capture-item" data-id="${capture.id}">
        <div class="capture-thumbnail" style="background-image: url('${capture.dataUrl}')"></div>
        <div class="capture-info">
          <div class="capture-url">${new URL(capture.url).hostname}</div>
          <div class="capture-time">${new Date(capture.timestamp).toLocaleTimeString()}</div>
        </div>
      </div>
    `).join('');
    
    // Add click handlers
    captureList.querySelectorAll('.capture-item').forEach(item => {
      item.addEventListener('click', () => {
        const captureId = item.dataset.id;
        const capture = captures.find(c => c.id === captureId);
        this.selectCaptureForWorkflow(capture);
      });
    });
  }

  selectCaptureForWorkflow(capture) {
    if (this.workflow.step === 'ready' || this.workflow.step === 'before') {
      this.workflow.beforeImage = capture;
      this.workflow.step = 'after';
    } else if (this.workflow.step === 'after') {
      this.workflow.afterImage = capture;
      this.workflow.step = 'ready-to-compare';
    }
    
    this.updateUI();
  }

  async compareImages() {
    if (!this.workflow.beforeImage || !this.workflow.afterImage) {
      this.showMessage('Please capture both before and after images', 'error');
      return;
    }
    
    try {
      this.setStatus('comparing', 'Comparing images...');
      
      const formData = new FormData();
      
      // Convert data URLs to blobs
      const beforeBlob = this.dataURLToBlob(this.workflow.beforeImage.dataUrl);
      const afterBlob = this.dataURLToBlob(this.workflow.afterImage.dataUrl);
      
      formData.append('image1', beforeBlob, 'before.png');
      formData.append('image2', afterBlob, 'after.png');
      formData.append('image1_name', 'Before');
      formData.append('image2_name', 'After');
      formData.append('sensitivity', this.settings.sensitivity.toString());
      formData.append('include_visualizations', 'true');
      
      const response = await fetch(`${this.settings.apiUrl}/comparison`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Store result and show in extension
      this.currentResult = result;
      this.showResults(result);
      
      // Only open in new tab if auto-open is enabled
      if (this.settings.autoOpenResults) {
        chrome.tabs.create({
          url: `http://localhost:3000/tech?comparison=${result.id}`
        });
      }
      
    } catch (error) {
      console.error('Error comparing images:', error);
      this.showMessage('Failed to compare images: ' + error.message, 'error');
    } finally {
      this.setStatus('ready', this.getWorkflowStatusText());
    }
  }

  showResults(result) {
    // Hide other sections
    document.body.classList.add('results-visible');
    
    // Show results section
    const resultsSection = document.getElementById('results-section');
    resultsSection.style.display = 'block';
    
    // Populate results data
    document.getElementById('result-score').textContent = `${result.difference_score.toFixed(1)}%`;
    document.getElementById('result-ssim').textContent = `${(result.metrics.ssim * 100).toFixed(1)}%`;
    document.getElementById('result-pixels').textContent = result.metrics.changed_pixels.toLocaleString();
    document.getElementById('result-time').textContent = `${result.processing_time_ms.toFixed(0)}ms`;
    
    // Show before/after thumbnails
    if (this.workflow.beforeImage && this.workflow.afterImage) {
      const beforePreview = document.getElementById('before-preview');
      const afterPreview = document.getElementById('after-preview');
      
      beforePreview.src = this.workflow.beforeImage.dataUrl;
      afterPreview.src = this.workflow.afterImage.dataUrl;
      beforePreview.style.display = 'block';
      afterPreview.style.display = 'block';
    }
    
    // Hide status message if visible
    document.getElementById('status-message').style.display = 'none';
    
    // Show success message briefly
    this.showMessage(`Analysis complete! ${result.difference_score.toFixed(1)}% difference detected`, 'success');
  }

  hideResults() {
    document.body.classList.remove('results-visible');
    document.getElementById('results-section').style.display = 'none';
    this.currentResult = null;
  }

  dataURLToBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  clearWorkflow() {
    this.workflow = {
      beforeImage: null,
      afterImage: null,
      step: 'ready'
    };
    this.hideResults();
    this.updateUI();
    this.showMessage('Workflow cleared', 'info');
  }

  updateUI() {
    const compareBtn = document.getElementById('compare-now');
    const workflowText = document.getElementById('workflow-text');
    
    compareBtn.disabled = this.workflow.step !== 'ready-to-compare';
    workflowText.textContent = this.getWorkflowStatusText();
    
    this.setStatus('ready', this.getWorkflowStatusText());
  }

  getWorkflowStatusText() {
    switch (this.workflow.step) {
      case 'ready':
        return 'Ready to capture';
      case 'before':
        return 'Capture "before" image';
      case 'after':
        return 'Capture "after" image';
      case 'ready-to-compare':
        return 'Ready to compare!';
      default:
        return 'Ready to capture';
    }
  }

  setStatus(type, message) {
    const indicator = document.getElementById('status-indicator');
    const text = document.getElementById('workflow-text');
    
    indicator.className = `status-indicator ${type}`;
    text.textContent = message;
  }

  showMessage(message, type) {
    const messageEl = document.getElementById('status-message');
    messageEl.textContent = message;
    messageEl.className = `status-message ${type}`;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
      if (messageEl.className.includes(type)) { // Only hide if it's the same message
        messageEl.style.display = 'none';
      }
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new DukuAIPopup();
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'elementCaptured') {
    // Handle element capture from content script
    window.dukuaiPopup?.handleCapture(message.dataUrl, 'element', message.url);
  }
});