# Quick Installation Guide

## 📦 **Install the DukuAI Browser Extension**

### Step 1: Create Simple Icons
Since we don't have PIL installed, create these simple icon files manually:

1. Go to https://www.favicon.cc/ or any icon generator
2. Create a 16x16, 48x48, and 128x128 icon with:
   - Dark background (#1a1a2e)
   - Green accent (#00ff88)
   - Simple design (like arrows or comparison symbol)
3. Save as `icon16.png`, `icon48.png`, `icon128.png` in the `icons/` folder

Or use these emoji-based icons temporarily:
- Copy any 📷 or 🔍 emoji image and resize to 16px, 48px, 128px

### Step 2: Load Extension in Chrome

1. **Open Chrome** and go to `chrome://extensions/`

2. **Enable Developer Mode** (toggle in top-right corner)

3. **Click "Load unpacked"**

4. **Select the folder:**
   ```
   /Users/vinben007/Documents/Personal Apps/DukuAI-Coding-Challenge/browser-extension
   ```

5. **Pin the extension:** Click the puzzle piece icon → pin DukuAI

### Step 3: Test the Extension

1. **Make sure your DukuAI backend is running:**
   ```bash
   cd /Users/vinben007/Documents/Personal\ Apps/DukuAI-Coding-Challenge
   docker-compose up -d
   ```

2. **Visit any website** (like google.com)

3. **Click the DukuAI extension icon**

4. **Try capturing:** Click "📷 Capture Viewport"

5. **Check the popup** shows "Ready to capture"

## 🚀 **How to Use**

### Basic Workflow:
1. **Capture "Before"** → Click 📷 Capture Viewport
2. **Make changes** to the page (or go to different version) 
3. **Capture "After"** → Click 📷 Capture Viewport again
4. **Compare** → Click 🔍 Compare Images
5. **View results** → Auto-opens in DukuAI web app

### Advanced Features:
- **Full Page:** Captures entire scrollable page
- **Element Select:** Click 🎯 to select specific elements
- **Right-click menu:** Right-click on any page for quick options
- **Settings:** Adjust API URL and sensitivity

## ⚙️ **Configuration**

Click the ⚙️ Settings in the popup to configure:
- **API URL:** `http://localhost:8000` (default)
- **Sensitivity:** 50% (default)
- **Auto-open results:** Enabled (default)

## 🐛 **Troubleshooting**

**Extension not loading?**
- Check all files are in the browser-extension folder
- Make sure Developer mode is enabled
- Try reloading the extension

**Can't capture images?**
- Refresh the webpage and try again
- Check if DukuAI backend is running: `curl http://localhost:8000/health`

**API errors?**
- Verify backend is running with `docker-compose ps`
- Check API URL in extension settings
- Look at browser console (F12) for errors

## ✅ **Success!**

If everything works, you should be able to:
- ✅ Capture screenshots of any webpage
- ✅ Compare before/after images
- ✅ See results in DukuAI web interface
- ✅ Use right-click context menu options
