# Debug Guide - Browser Insight Tool

This guide explains how to set up and use the automated browser debugging tool that gives full visibility into what's happening in the browser.

---

## What This Does

The debug tool uses Playwright to:

- ✅ Launch a real browser and navigate to your app
- ✅ Capture **all** console messages (errors, warnings, logs)
- ✅ Capture **all** network requests and responses
- ✅ Take screenshots at key moments
- ✅ Test the converter functionality
- ✅ Generate detailed reports you can read

**Result**: Complete visibility into browser behavior without manual copy/paste!

---

## Quick Setup

### Step 1: Install Playwright (One-Time)

```bash
cd frontend/schema-authoring
pnpm run debug:install
```

This installs Playwright and downloads Chromium (~170MB).

### Step 2: Make Sure Servers Are Running

The debug tool needs the app to be running:

**Terminal 1** - Start servers:

```bash
pnpm run dev:full
```

**Terminal 2** - Run debug tool:

```bash
pnpm run debug:browser
```

---

## What You'll Get

After running `pnpm run debug:browser`, you'll get:

### 1. Live Console Output

Real-time stream of everything happening in the browser:

```
🚀 Starting browser debug session...
🌐 Launching Chromium...
🔗 Navigating to app...
📤 GET http://localhost:3003/
✅ 200 OK http://localhost:3003/
ℹ️ [INFO] App load time: 773.60 ms
📤 POST http://localhost:3003/api/convert
❌ 404 Not Found http://localhost:3003/api/convert
⚠️ [WARNING] WASM converter initialization failed
✅ Page loaded in 1234ms
```

### 2. Screenshots

Saved to `debug-output/`:

- `screenshot-initial.png` - App right after load
- `screenshot-after-conversion.png` - After test conversion

### 3. JSON Report

`debug-output/debug-report.json` - Complete structured data:

```json
{
  "timestamp": "2025-01-03T...",
  "url": "http://localhost:3003",
  "consoleMessages": [...],
  "networkRequests": [...],
  "errors": [...],
  "summary": {
    "errorCount": 5,
    "apiFailures": 3,
    ...
  }
}
```

### 4. Human-Readable Summary

`debug-output/debug-summary.txt` - Easy to read overview:

```
Browser Debug Report
============================================================
Timestamp: 2025-01-03T20:15:30.000Z
URL: http://localhost:3003

SUMMARY
------------------------------------------------------------
Total Console Messages: 42
  - Errors: 5
  - Warnings: 8
  - Other: 29

Network Requests: 15
  - Failed: 3
  - API Calls: 10
  - API Failures: 3

CONSOLE ERRORS
------------------------------------------------------------
1. [2025-01-03T...] POST http://localhost:3003/api/convert 404
   Location: node-converter.ts:75:10

FAILED NETWORK REQUESTS
------------------------------------------------------------
1. POST http://localhost:3003/api/convert
   Status: 404 Not Found
   Response: {"error": "Not found"}

RECOMMENDATIONS
------------------------------------------------------------
⚠️ API requests are failing - check if API server is running
✅ No Monaco worker issues detected
```

---

## Usage Scenarios

### Scenario 1: Something's Not Working

```bash
# Terminal 1
pnpm run dev:full

# Terminal 2
pnpm run debug:browser

# Check the output
cat debug-output/debug-summary.txt
```

Look for:

- Red ❌ errors in console
- 404s or 500s in network requests
- High error counts
- API failures

### Scenario 2: Need Full Details

```bash
# Run debug
pnpm run debug:browser

# Open detailed JSON report
cat debug-output/debug-report.json | jq .

# Or use any JSON viewer
code debug-output/debug-report.json
```

### Scenario 3: Visual Debugging

```bash
# Run debug
pnpm run debug:browser

# Open screenshots
open debug-output/screenshot-initial.png
open debug-output/screenshot-after-conversion.png
```

---

## Advanced: Headful Mode

To **see** the browser while it runs (useful for understanding visual issues):

Edit `debug-browser.ts`:

```typescript
browser = await chromium.launch({
  headless: false, // ← Change this from true to false
  slowMo: 1000, // ← Optional: slow down actions by 1s
});
```

Then run:

```bash
pnpm run debug:browser
```

You'll see Chrome open and watch it navigate, click, etc.

---

## What Gets Captured

### Console Messages

- All `console.log()`, `console.error()`, `console.warn()`
- React error boundaries
- Monaco editor messages
- Converter status logs
- Network errors

### Network Activity

- Request URL, method, headers
- POST body data
- Response status, headers
- Response body (for API calls)
- Timing information
- Failed requests (4xx, 5xx)

### Page Errors

- JavaScript exceptions
- Unhandled promise rejections
- React errors
- Parser errors

### Screenshots

- Initial page load
- After conversion test
- Full page (scrollable)

### App State

- Checks if Monaco loaded
- Checks if React loaded
- Checks if Schema Authoring API exists
- Converter engine status
- Editor content state

---

## Interpreting Results

### ✅ Good Signs

```
Summary:
  - Errors: 0
  - Warnings: 0-2 (some warnings are normal)
  - API Failures: 0
  - Page Load Time: < 3000ms

Recommendations:
  ✅ No major issues detected!
```

### ⚠️ Warning Signs

```
Summary:
  - Errors: 5+
  - API Failures: 3+
  - Failed Requests: 3+

Recommendations:
  ⚠️ API requests are failing - check if API server is running
  ⚠️ High error count - review console errors above
```

### Common Issues & Fixes

**Issue**: `POST /api/convert 404`

- **Fix**: API server not running → `pnpm run dev:full`

**Issue**: `WASM converter initialization failed`

- **Fix**: Normal if WASM not built → ignore or run `pnpm run build:wasm`

**Issue**: `monaco-editor worker failed`

- **Fix**: Monaco worker config issue → check `vite.config.ts` and `index.html`

**Issue**: High load time (>5s)

- **Fix**: Check bundle size, optimize imports, check network

---

## Customizing the Debug Script

### Change Wait Times

```typescript
// Wait longer for app to initialize
await page.waitForTimeout(5000); // 5 seconds
```

### Add Custom Tests

```typescript
// Test clicking a button
await page.click('[data-testid="convert-button"]');
await page.waitForTimeout(1000);
await page.screenshot({ path: "debug-output/after-click.png" });
```

### Check Specific Elements

```typescript
// Check if editors are visible
const editorsVisible = await page.evaluate(() => {
  const editors = document.querySelectorAll(".monaco-editor");
  return Array.from(editors).map((el) => ({
    visible: el.offsetParent !== null,
    width: el.clientWidth,
    height: el.clientHeight,
  }));
});
console.log("Editors:", editorsVisible);
```

---

## Continuous Monitoring

You can run this periodically or in CI:

```bash
# Run every 5 minutes (macOS/Linux)
watch -n 300 'cd frontend/schema-authoring && pnpm run debug:browser'

# Or create a cron job
*/5 * * * * cd /path/to/project/frontend/schema-authoring && pnpm run debug:browser
```

---

## CI Integration

Add to GitHub Actions:

```yaml
- name: Debug Browser
  run: |
    cd frontend/schema-authoring
    pnpm run dev:full &
    sleep 5
    pnpm run debug:browser

- name: Upload Debug Artifacts
  uses: actions/upload-artifact@v3
  with:
    name: debug-output
    path: frontend/schema-authoring/debug-output/
```

---

## Troubleshooting the Debug Tool

### "playwright: command not found"

Run setup:

```bash
pnpm run debug:install
```

### "Error: browserType.launch: Executable doesn't exist"

Install browsers:

```bash
pnpm exec playwright install chromium
```

### "Navigation timeout"

App not running. Start it first:

```bash
pnpm run dev:full
```

### "Connection refused"

Wrong port. Check if app is on 3003:

```bash
curl http://localhost:3003
```

---

## Output Files Reference

```
debug-output/
├── debug-report.json          # Full structured data (all details)
├── debug-summary.txt          # Human-readable summary
├── screenshot-initial.png     # App on first load
└── screenshot-after-conversion.png  # After test
```

---

## Benefits

✅ **No Manual Work**: Automated capture of all browser activity  
✅ **Complete Visibility**: See everything, not just what you remember to check  
✅ **Reproducible**: Run the same test every time  
✅ **Historical**: Save reports to compare over time  
✅ **CI-Ready**: Can run in automated pipelines  
✅ **Shareable**: Send reports to others for debugging

---

## Example Workflow

```bash
# 1. Start the app
cd frontend/schema-authoring
pnpm run dev:full

# 2. In another terminal, run debug
pnpm run debug:browser

# 3. Check summary
cat debug-output/debug-summary.txt

# 4. If issues found, check detailed JSON
cat debug-output/debug-report.json | jq '.consoleMessages[] | select(.type == "error")'

# 5. View screenshots
open debug-output/*.png

# 6. Fix issues and re-run
pnpm run debug:browser
```

---

## Next Steps

1. **First Run**: `pnpm run debug:install && pnpm run debug:browser`
2. **Review Output**: Check `debug-output/debug-summary.txt`
3. **Fix Issues**: Address errors/warnings found
4. **Re-Run**: Verify fixes with another debug run
5. **Iterate**: Keep running until summary shows ✅

Happy debugging! 🐛🔍
