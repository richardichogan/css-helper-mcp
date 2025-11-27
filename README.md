# CSS Helper MCP Server

A Model Context Protocol (MCP) server for CSS debugging with a comprehensive 5-phase investigation protocol.

## Features

- **5-Phase Investigation Protocol**: Systematic approach to CSS debugging
- **CSS Knowledge Base**: Built-in solutions for common CSS issues (centering, z-index, flexbox, grid, overflow, etc.)
- **Framework-Aware**: Understands defaults for Material-UI, Tailwind, Bootstrap, Ant Design, and more
- **File System Integration**: Search and read CSS/component files in your workspace
- **Stateful Investigations**: Track findings across multiple phases

## Available Tools

### Investigation Tools (5-Phase Protocol)

1. **css_investigate_start** - Initialize a new CSS investigation
   - Returns investigation ID, protocol overview, and relevant CSS knowledge
   - Parameters: `issue` (description), `workspacePath` (optional)

2. **css_phase1_structure** - Phase 1: Structure Analysis
   - Search for components, read files, map hierarchy
   - Parameters: `investigationId`, `componentPattern`, `workspacePath`

3. **css_phase2_cascade** - Phase 2: Cascade Tracing
   - Search CSS files for matching selectors and rules with **specificity analysis**
   - Parameters: `investigationId`, `cssPattern`, `selector`, `workspacePath`

4. **css_phase3_conflicts** - Phase 3: Conflict Detection
   - Analyze for duplicates, !important usage, specificity issues
   - Parameters: `investigationId`

5. **css_phase4_multilevel** - Phase 4: Multi-Level Cascade Analysis
   - Trace how styles combine across levels
   - Parameters: `investigationId`

6. **css_phase4b_browser** - Phase 4b: Live Browser Inspection (Optional)
   - Auto-connect to Edge/Chrome DevTools to inspect actual computed styles
   - **Automatically captures screenshot** of inspected element
   - Parameters: `investigationId`, `elementSelector`, `chromePort` (default: 9222), `autoLaunch` (default: false)
   - **Auto-detects running browser or can auto-launch Edge**

7. **css_compare_screenshots** - Compare Screenshots for Visual Differences
   - Compare expected vs actual screenshots to identify visual differences
   - Uses pixelmatch algorithm to highlight changed pixels
   - Generates diff image showing exact differences in pink
   - Parameters: `expectedImage`, `actualImage`, `threshold` (default: 0.1), `investigationId` (optional)
   - Returns: Diff percentage, pixel count, and diff image path

8. **css_phase5_solution** - Phase 5: Solution Design
   - Generate fix with code and explanation based on static and/or live browser analysis
   - **Includes visual diff results** if screenshot comparison was performed
   - Parameters: `investigationId`, `originalIssue`

### Utility Tools

9. **css_search_files** - Search for CSS/SCSS/LESS files
   - Parameters: `pattern` (glob), `workspacePath`

10. **css_read_component** - Read component file contents
   - Parameters: `filePath`

11. **css_get_knowledge** - Query CSS knowledge base
   - Parameters: `query` (e.g., "centering", "flexbox", "z-index")

## Edge/Chrome DevTools Integration (Optional)

For **Phase 4b** live browser inspection, Edge or Chrome can be used:

**Option 1: Manual Launch (Recommended)**
```powershell
# Edge (recommended for Windows)
msedge.exe --remote-debugging-port=9222

# Chrome
chrome.exe --remote-debugging-port=9222
```

**Option 2: Auto-Launch**
Set `autoLaunch: true` when calling `css_phase4b_browser` - it will automatically start Edge if not already running.

**Why use Phase 4b?**
- Static analysis predicts cascade behavior, but **JavaScript**, **timing**, and **browser quirks** can change the outcome
- Phase 4b connects to Chrome DevTools Protocol to fetch **actual computed styles**
- Compares static predictions vs browser reality
- Generates fixes based on **truth, not guesses**

**When to skip Phase 4b:**
- Simple CSS-only issues without JavaScript interaction
- Quick static analysis sufficient
- Chrome debugging not available/desired

## Installation

```bash
npm install
npm run build
```

## Configuration

Add to your workspace's `.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "css-helper": {
      "command": "node",
      "args": [
        "c:\\Users\\RichardHogan\\Development\\CSS-Helper MCP\\build\\index.js"
      ],
      "type": "stdio"
    }
  }
}
```

**Important**: 
- Replace the path with your actual installation path
- VS Code MCP configuration is workspace-specific - copy this to each project's `.vscode/mcp.json`

## Usage with GitHub Copilot

Once configured, use the CSS Helper via GitHub Copilot Chat:

```
@workspace Use css_investigate_start to debug: "Button not centered in container"
```

Follow the 5-phase protocol to systematically diagnose and fix CSS issues.

## Example Investigation Flow

### Basic Flow (Static Analysis Only)

1. **Start**: Use `css_investigate_start` with issue description
2. **Structure**: Use `css_phase1_structure` with component pattern (e.g., `**/*Button*.tsx`)
3. **Cascade**: Use `css_phase2_cascade` with CSS pattern (e.g., `**/*.css`) and selector (e.g., `.button`)
   - Now includes **CSS specificity calculation** and cascade prediction
4. **Conflicts**: Use `css_phase3_conflicts` to detect issues
5. **Analysis**: Use `css_phase4_multilevel` for cascade layers
6. **Solution**: Use `css_phase5_solution` to get the fix

### Enhanced Flow (With Live Browser Inspection + Screenshot Comparison)

**Option A: Manual Browser Launch**
1. **Start Edge with debugging**: `msedge.exe --remote-debugging-port=9222`
2. **Open your webpage** in that Edge instance
3. **Run phases 1-4** as normal
4. **Add Phase 4b**: Use `css_phase4b_browser` with `elementSelector` (e.g., `.button`, `#header`)
   - Automatically captures screenshot of the element
5. **Compare screenshots** (optional): Use `css_compare_screenshots` with baseline and captured screenshot
   - Shows exact pixel differences and generates diff image
6. **Generate solution**: Use `css_phase5_solution`
   - Includes visual diff data if comparison was performed

**Option B: Fully Automated (Zero Manual Steps)**
1. **Run phases 1-4** as normal
2. **Add Phase 4b**: Use `css_phase4b_browser` with `elementSelector` and `autoLaunch: true`
   - Automatically launches Edge if not running
   - Fetches **actual computed styles** from browser
   - **Captures screenshot** automatically
   - Compares static predictions vs reality
3. **Compare with baseline** (optional): Use `css_compare_screenshots` to verify visual accuracy
   - Highlights pixel-level differences
   - Quantifies visual regression
4. **Generate solution**: Use `css_phase5_solution` 
   - Now uses **browser data** for accurate fixes
   - Shows "Static predicted X but browser applied Y" insights
   - **Includes visual diff percentage** if screenshots were compared

## Screenshot Comparison

The `css_compare_screenshots` tool uses the pixelmatch algorithm to identify visual differences:

**Features:**
- Pixel-perfect comparison between expected and actual screenshots
- Adjustable threshold (0-1, default 0.1) for match sensitivity
- Generates diff image highlighting changed pixels in pink
- Returns percentage of different pixels
- Automatically stored in investigation if `investigationId` provided

**Example Usage:**
```
Use css_compare_screenshots with:
- expectedImage: "path/to/baseline.png"
- actualImage: ".css-helper-screenshots/investigation-123-timestamp.png"
- threshold: 0.1 (optional)
- investigationId: "investigation-123" (optional)
```

**Output:**
- Diff percentage (e.g., "2.34% different")
- Changed pixel count
- Diff image path showing exact differences
- Status: ✅ (<1%), ⚠️ (1-5%), or ❌ (>5%)

## CSS Knowledge Base

The server includes solutions for:
- **Centering**: Flexbox, Grid, and absolute positioning approaches
- **Z-Index**: Stacking context and positioning issues
- **Flexbox**: Wrap, flex-basis, and min-width problems
- **Grid**: Template columns, auto-fit, and minmax issues
- **Overflow**: Text wrapping and scrollable containers
- **Specificity**: Selector hierarchy and !important usage
- **Positioning**: Relative, absolute, fixed, and sticky
- **Responsive**: Media queries and fluid layouts

## Testing

### MCP Inspector (Quick Test)
```bash
npx @modelcontextprotocol/inspector node "c:\Users\RichardHogan\Development\CSS-Helper MCP\build\index.js"
```

Look for:
- Green "Running" indicator
- All 11 tools listed (updated from 9)
- Server name "css-helper" version "1.0.0"

### VS Code with ACRE Project
1. Copy `.vscode/mcp.json` to your ACRE project
2. Restart VS Code
3. Use GitHub Copilot Chat with `@workspace` to access tools

## Development

```bash
npm run build    # Compile TypeScript
npm run prepare  # Pre-commit build hook
```

## Troubleshooting

**Server not showing in VS Code:**
- Verify `.vscode/mcp.json` exists with correct path
- Restart VS Code after configuration changes
- Check VS Code MCP panel for connection status

**Module errors:**
- Run `npm install` to ensure dependencies are installed
- Check `build/index.js` exists after `npm run build`

## License

ISC
