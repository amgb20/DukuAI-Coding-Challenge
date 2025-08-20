# DukuAI Browser Extension

A powerful browser extension for capturing and comparing visual changes on any website with AI-powered difference detection.

## Features

### 🖼️ **Multiple Capture Modes**
- **Viewport Capture**: Current visible area
- **Full Page Capture**: Entire webpage including scrollable content
- **Element Selector**: Click to select and capture specific elements

### 🔄 **Before/After Workflow**
- Capture "before" and "after" images
- Automatic comparison using DukuAI backend
- Real-time difference analysis

### ⚡ **Quick Actions**
- Right-click context menu integration
- One-click capture from any webpage
- Auto-open results in DukuAI web app

### 🛠️ **Customizable Settings**
- Adjustable API endpoint
- Sensitivity control (1-100%)
- Auto-open results option

## Installation

### Method 1: Load as Unpacked Extension (Development)

1. **Clone the repository:**
   ```bash
   cd /Users/vinben007/Documents/Personal\ Apps/DukuAI-Coding-Challenge
   ```

2. **Create extension icons (optional):**
   ```bash
   cd browser-extension
   python3 icons/create_icons.py
   ```

3. **Open Chrome and go to Extensions:**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

4. **Load the extension:**
   - Click "Load unpacked"
   - Select the `browser-extension` folder
   - The extension should now appear in your extensions list

5. **Pin the extension:**
   - Click the puzzle piece icon in Chrome toolbar
   - Pin "DukuAI Visual Comparison" for easy access

### Method 2: Package for Chrome Web Store (Production)

1. **Create a ZIP package:**
   ```bash
   cd browser-extension
   zip -r dukuai-extension.zip . -x "*.py" "README.md" "icons/create_icons.py"
   ```

2. **Upload to Chrome Web Store:**
   - Visit [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Create new item and upload the ZIP file

## Usage

### Prerequisites

Make sure your DukuAI backend is running:
```bash
cd /Users/vinben007/Documents/Personal\ Apps/DukuAI-Coding-Challenge
docker-compose up -d
```

The extension expects the API to be available at `http://localhost:8000` by default.

### Basic Workflow

1. **Open any webpage** you want to capture

2. **Click the DukuAI extension icon** in the toolbar

3. **Capture the "before" image:**
   - Click "📷 Capture Viewport" for current view
   - Click "📄 Full Page" for entire page
   - Click "🎯 Select Element" to choose specific elements

4. **Make changes** to the webpage (or navigate to a different version)

5. **Capture the "after" image** using the same method

6. **Click "🔍 Compare Images"** to analyze differences

7. **View results** in the DukuAI web application (auto-opens if enabled)

### Context Menu Options

Right-click on any webpage to access quick capture options:
- "Capture viewport with DukuAI"
- "Capture full page with DukuAI"
- "Capture element with DukuAI"
- "Open DukuAI comparison tool"

### Element Selection

When using "Select Element" mode:
1. Click the button to activate selection mode
2. Move your mouse over the page - elements will be highlighted
3. Click on the desired element to capture it
4. Press ESC to cancel selection

### Settings Configuration

Click the ⚙️ Settings section in the popup to configure:

- **API URL**: Change if your backend runs on a different port/host
- **Sensitivity**: Adjust comparison sensitivity (1-100%)
- **Auto-open results**: Toggle automatic opening of results page

## Troubleshooting

### Common Issues

1. **Extension not working:**
   - Check that DukuAI backend is running (`docker-compose ps`)
   - Verify API URL in extension settings
   - Check browser console for errors (F12 → Console)

2. **Captures not working:**
   - Make sure the extension has "activeTab" permission
   - Try refreshing the webpage and capturing again
   - Check if the page has security restrictions

3. **API connection errors:**
   - Verify backend is accessible at `http://localhost:8000/health`
   - Check CORS settings in backend allow `chrome-extension://` origins
   - Update API URL in extension settings if needed

4. **Full page capture incomplete:**
   - Some pages with dynamic content may not capture correctly
   - Try waiting for the page to fully load before capturing
   - Use viewport capture as an alternative

### Debug Mode

1. Open Chrome DevTools (F12)
2. Go to Extensions tab
3. Find "DukuAI Visual Comparison"
4. Click "background page" to debug the service worker
5. Check Console for error messages

### Storage Management

The extension stores:
- Last 20 captures locally
- User settings
- Workflow state

To clear extension data:
1. Go to `chrome://extensions/`
2. Find DukuAI extension
3. Click "Details" → "Extension options"
4. Or use `chrome://settings/content/all` → search for extension

## Development

### File Structure

```
browser-extension/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup UI
├── popup.css              # Popup styling
├── popup.js               # Popup functionality
├── background.js          # Service worker (background tasks)
├── content.js             # Content script (runs on web pages)
├── overlay.css            # Styles for page overlays
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── create_icons.py    # Icon generation script
└── README.md              # This file
```

### Key Components

1. **Popup (`popup.js`)**: Main UI for capturing and managing workflow
2. **Background (`background.js`)**: Context menu, notifications, and storage
3. **Content Script (`content.js`)**: Page interaction and element selection
4. **Overlay Styles (`overlay.css`)**: Visual feedback during element selection

### API Integration

The extension communicates with the DukuAI backend using:
- `POST /comparison` - Upload and compare images
- Standard multipart/form-data for image uploads
- JSON responses with comparison results

### Permissions

Required permissions:
- `activeTab` - Capture screenshots of current tab
- `storage` - Store captures and settings
- `contextMenus` - Right-click menu options
- `scripting` - Inject content scripts
- `notifications` - Show capture notifications

## Contributing

1. Fork the repository
2. Make your changes in the `browser-extension/` directory
3. Test thoroughly with different websites
4. Submit a pull request with description of changes

## License

This extension is part of the DukuAI project and follows the same license terms.
