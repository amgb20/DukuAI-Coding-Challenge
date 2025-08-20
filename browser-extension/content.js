// Content script for DukuAI extension
// This script runs on every web page

class DukuAIContent {
  constructor() {
    this.isActive = false;
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'startElementSelector':
          this.startElementSelector();
          sendResponse({ success: true });
          break;
          
        case 'captureFullPage':
          this.captureFullPage().then(result => {
            sendResponse(result);
          }).catch(error => {
            sendResponse({ success: false, error: error.message });
          });
          return true; // Keep message channel open for async response
          
        case 'getPageInfo':
          sendResponse(this.getPageInfo());
          break;
      }
    });
  }

  getPageInfo() {
    return {
      url: window.location.href,
      title: document.title,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      page: {
        width: Math.max(
          document.body.scrollWidth,
          document.body.offsetWidth,
          document.documentElement.clientWidth,
          document.documentElement.scrollWidth,
          document.documentElement.offsetWidth
        ),
        height: Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight
        )
      }
    };
  }

  async captureFullPage() {
    try {
      const pageInfo = this.getPageInfo();
      const originalScrollTop = window.pageYOffset;
      const originalScrollLeft = window.pageXOffset;
      
      const viewportHeight = window.innerHeight;
      const totalHeight = pageInfo.page.height;
      const chunks = Math.ceil(totalHeight / viewportHeight);
      
      // Show progress indicator
      this.showCaptureProgress(0, chunks);
      
      const captures = [];
      
      for (let i = 0; i < chunks; i++) {
        // Scroll to position
        window.scrollTo(0, i * viewportHeight);
        
        // Wait for content to load and settle
        await this.waitForContent(300);
        
        // Update progress
        this.showCaptureProgress(i + 1, chunks);
        
        // Request screenshot from background script
        const dataUrl = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'captureVisibleTab' }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (response) {
              resolve(response);
            } else {
              // Fallback: use tabs.captureVisibleTab directly
              chrome.tabs.captureVisibleTab(null, { format: 'png' }, resolve);
            }
          });
        });
        
        captures.push(dataUrl);
      }
      
      // Restore original scroll position
      window.scrollTo(originalScrollLeft, originalScrollTop);
      
      // Hide progress indicator
      this.hideCaptureProgress();
      
      // Combine all chunks
      const combinedImage = await this.combineImageChunks(captures, totalHeight, pageInfo.page.width);
      
      return { success: true, dataUrl: combinedImage };
      
    } catch (error) {
      console.error('Error capturing full page:', error);
      this.hideCaptureProgress();
      return { success: false, error: error.message };
    }
  }

  showCaptureProgress(current, total) {
    let progressEl = document.getElementById('dukuai-capture-progress');
    if (!progressEl) {
      progressEl = document.createElement('div');
      progressEl.id = 'dukuai-capture-progress';
      progressEl.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #1a1a2e;
        color: #eee;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: sans-serif;
        font-size: 14px;
        z-index: 1000000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        border: 1px solid #00ff88;
      `;
      document.body.appendChild(progressEl);
    }
    
    progressEl.innerHTML = `
      <div style="margin-bottom: 8px; font-weight: bold; color: #00ff88;">DukuAI Capturing Full Page</div>
      <div>Progress: ${current}/${total} sections</div>
      <div style="width: 200px; height: 4px; background: #333; border-radius: 2px; margin-top: 8px;">
        <div style="width: ${(current / total) * 100}%; height: 100%; background: #00ff88; border-radius: 2px; transition: width 0.3s;"></div>
      </div>
    `;
  }

  hideCaptureProgress() {
    const progressEl = document.getElementById('dukuai-capture-progress');
    if (progressEl) {
      progressEl.remove();
    }
  }

  async waitForContent(timeout = 500) {
    return new Promise((resolve) => {
      setTimeout(resolve, timeout);
    });
  }

  async combineImageChunks(imageDataUrls, totalHeight, totalWidth) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = totalWidth;
      canvas.height = totalHeight;
      
      let loadedImages = 0;
      const images = [];
      
      if (imageDataUrls.length === 0) {
        reject(new Error('No image chunks to combine'));
        return;
      }
      
      imageDataUrls.forEach((dataUrl, index) => {
        const img = new Image();
        img.onload = () => {
          images[index] = img;
          loadedImages++;
          
          if (loadedImages === imageDataUrls.length) {
            // Draw all images onto the canvas
            images.forEach((img, i) => {
              ctx.drawImage(img, 0, i * window.innerHeight);
            });
            
            resolve(canvas.toDataURL('image/png'));
          }
        };
        
        img.onerror = () => {
          reject(new Error(`Failed to load image chunk ${index}`));
        };
        
        img.src = dataUrl;
      });
    });
  }

  startElementSelector() {
    if (this.isActive) return;
    
    this.isActive = true;
    this.createElementSelector();
  }

  createElementSelector() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'dukuai-selector-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      z-index: 999999;
      cursor: crosshair;
    `;

    // Create highlight box
    const highlightBox = document.createElement('div');
    highlightBox.id = 'dukuai-highlight-box';
    highlightBox.style.cssText = `
      position: absolute;
      border: 2px dashed #00ff88;
      background: rgba(0, 255, 136, 0.1);
      pointer-events: none;
      z-index: 1000000;
      display: none;
      transition: all 0.1s ease;
    `;

    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.id = 'dukuai-toolbar';
    toolbar.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1a1a2e;
      color: #eee;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      z-index: 1000001;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      border: 1px solid #00ff88;
      backdrop-filter: blur(10px);
    `;
    toolbar.innerHTML = `
      <div style="margin-bottom: 8px; font-weight: bold; color: #00ff88;">DukuAI Element Selector</div>
      <div>Click on any element to capture it</div>
      <div style="font-size: 11px; opacity: 0.8; margin-top: 4px;">Press ESC to cancel</div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(highlightBox);
    document.body.appendChild(toolbar);

    let currentElement = null;

    const handleMouseMove = (e) => {
      const element = document.elementFromPoint(e.clientX, e.clientY);
      
      if (element && 
          element !== overlay && 
          element !== highlightBox && 
          element !== toolbar &&
          !toolbar.contains(element)) {
        
        currentElement = element;
        const rect = element.getBoundingClientRect();
        
        highlightBox.style.left = (rect.left + window.scrollX) + 'px';
        highlightBox.style.top = (rect.top + window.scrollY) + 'px';
        highlightBox.style.width = rect.width + 'px';
        highlightBox.style.height = rect.height + 'px';
        highlightBox.style.display = 'block';
      }
    };

    const handleClick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (currentElement) {
        await this.captureElement(currentElement);
      }
      
      this.cleanup();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        this.cleanup();
      }
    };

    overlay.addEventListener('mousemove', handleMouseMove);
    overlay.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    // Store cleanup function
    this.cleanupElementSelector = () => {
      overlay.removeEventListener('mousemove', handleMouseMove);
      overlay.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
      
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (highlightBox.parentNode) highlightBox.parentNode.removeChild(highlightBox);
      if (toolbar.parentNode) toolbar.parentNode.removeChild(toolbar);
      
      this.isActive = false;
      this.cleanupElementSelector = null;
    };
  }

  async captureElement(element) {
    try {
      const rect = element.getBoundingClientRect();
      
      // Get element info
      const elementInfo = {
        tagName: element.tagName,
        className: element.className,
        id: element.id,
        text: element.textContent ? element.textContent.substring(0, 50) : '',
        rect: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        }
      };
      
      // Request screenshot from background
      const fullScreenshot = await new Promise((resolve, reject) => {
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(dataUrl);
          }
        });
      });
      
      // Crop the element from the full screenshot
      const elementDataUrl = await this.cropImage(fullScreenshot, rect);
      
      // Send captured element data to background
      chrome.runtime.sendMessage({
        type: 'elementCaptured',
        dataUrl: elementDataUrl,
        url: window.location.href,
        element: elementInfo,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Error capturing element:', error);
      throw error;
    }
  }

  async cropImage(dataUrl, rect) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        ctx.drawImage(
          img,
          rect.left, rect.top, rect.width, rect.height,
          0, 0, rect.width, rect.height
        );
        
        resolve(canvas.toDataURL('image/png'));
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for cropping'));
      };
      
      img.src = dataUrl;
    });
  }

  cleanup() {
    if (this.cleanupElementSelector) {
      this.cleanupElementSelector();
    }
  }
}

// Initialize content script
const dukuaiContent = new DukuAIContent();

// Expose for debugging
window.dukuaiContent = dukuaiContent;