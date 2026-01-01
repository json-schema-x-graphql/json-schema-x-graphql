# Browser Debug System - Complete Visibility

**Automated browser testing and debugging for full insight into the running application**

---

## 🎯 Problem Solved

Previously, debugging required:
- ❌ Manual copy/paste of console logs
- ❌ Guessing what's happening in the browser
- ❌ Missing network errors
- ❌ No visibility into Monaco editor state
- ❌ Incomplete error information

**Now you have:**
- ✅ Automated capture of ALL console output
- ✅ Complete network request/response logging
- ✅ Screenshots at key moments
- ✅ Structured JSON reports
- ✅ Human-readable summaries
- ✅ Zero manual work

---

## 🚀 Quick Start

### 1. One-Time Setup

```bash
cd frontend/schema-authoring
pnpm run debug:install
```

This installs Playwright (~170MB) and Chromium browser.

### 2. Run Debug Session

**Terminal 1** - Start the app:
```bash
pnpm run dev:full
```

**Terminal 2** - Run debug tool:
```bash
pnpm run debug:browser
```

### 3. View Results

```bash
# Quick summary
cat debug-output/debug-summary.txt

# Full details
cat debug-output/debug-report.json | jq .

# Screenshots
ls debug-output/*.png
```

---

## 📊 What You Get

### Live Console Stream

Real-time output showing everything happening in the browser:

```
🚀 Starting browser debug session...
🌐 Launching Chromium...
🔗 Navigating to app...
✅ 200 OK http://localhost:3003/
ℹ️ [INFO] App load time: 773.60 ms
ℹ️ [INFO] EditorPanel mounted: mode=jsonschema
ℹ️ [INFO] ✓ jsonschema editor mounted successfully
📤 POST http://localhost:3003/api/convert
✅ 200 OK http://localhost:3003/api/convert
ℹ️ [INFO] ✓ Node converter ready
📸 Screenshot saved: debug-output/screenshot-initial.png
✅ Page loaded in 1234ms
```

### Summary Report (`debug-summary.txt`)

```
Browser Debug Report
============================================================
Timestamp: 2025-01-03T20:30:00.000Z
URL: http://localhost:3003

SUMMARY
------------------------------------------------------------
Total Console Messages: 42
  - Errors: 0
  - Warnings: 2
  - Other: 40

Network Requests: 15
  - Failed: 0
  - API Calls: 5
  - API Failures: 0

Page Load Time: 1234ms
Screenshots: 2

RECOMMENDATIONS
------------------------------------------------------------
✅ No major issues detected!
```

### Detailed JSON Report (`debug-report.json`)

Complete structured data including:
- Every console message with timestamp, type, location
- Every network request with headers, body, response
- All JavaScript errors with stack traces
- Page metrics (load time, etc.)
- Screenshots paths

### Screenshots

- `screenshot-initial.png` - App immediately after load
- `screenshot-after-conversion.png` - After test conversion

---

## 🔍 Example: Diagnosing Issues

### Before (Manual Process)

1. Open browser
2. Open DevTools
3. Try to remember to check console
4. See error
5. Try to copy/paste
6. Miss important context
7. Ask user to send logs

### After (Automated)

```bash
pnpm run debug:browser
cat debug-output/debug-summary.txt
```

Instantly see:
- All errors with full context
- All network failures
- API response bodies
- Screenshots showing visual state
- Performance metrics

---

## 🛠️ Common Use Cases

### Use Case 1: "Why isn't the converter working?"

```bash
pnpm run debug:browser
grep "api/convert" debug-output/debug-summary.txt
```

Shows:
- If API calls are happening
- What status codes returned
- Request/response bodies
- Timing information

### Use Case 2: "Are Monaco editors loading?"

```bash
pnpm run debug:browser
grep -i "monaco" debug-output/debug-report.json
```

Shows:
- Monaco initialization messages
- Editor mount events
- Worker loading status
- Any Monaco errors

### Use Case 3: "What errors are happening?"

```bash
pnpm run debug:browser
jq '.consoleMessages[] | select(.type == "error")' debug-output/debug-report.json
```

Shows every error with:
- Exact timestamp
- Error message
- Stack trace
- File and line number

### Use Case 4: "Visual debugging"

```bash
pnpm run debug:browser
open debug-output/screenshot-*.png
```

See exactly what the browser displays.

---

## 📈 Output Files

```
frontend/schema-authoring/debug-output/
├── debug-report.json                    # Full structured data
├── debug-summary.txt                    # Human-readable summary
├── screenshot-initial.png               # Initial load
└── screenshot-after-conversion.png      # After test
```

### `debug-report.json` Structure

```json
{
  "timestamp": "2025-01-03T20:30:00.000Z",
  "url": "http://localhost:3003",
  "consoleMessages": [
    {
      "timestamp": "2025-01-03T20:30:01.123Z",
      "type": "error",
      "text": "POST http://localhost:3003/api/convert 404",
      "location": "node-converter.ts:75:10",
      "args": ["POST", "http://localhost:3003/api/convert", "404"]
    }
  ],
  "networkRequests": [
    {
      "timestamp": "2025-01-03T20:30:01.120Z",
      "method": "POST",
      "url": "http://localhost:3003/api/convert",
      "status": 404,
      "statusText": "Not Found",
      "postData": "{\"direction\":\"json-to-graphql\",\"input\":{...}}",
      "responseBody": "{\"error\":\"Not found\"}",
      "requestHeaders": {...},
      "responseHeaders": {...}
    }
  ],
  "errors": [],
  "pageMetrics": {
    "loadTime": 1234
  },
  "screenshots": ["..."],
  "summary": {
    "totalConsoleMessages": 42,
    "errorCount": 1,
    "warningCount": 2,
    "networkRequests": 15,
    "failedRequests": 1,
    "apiCalls": 5,
    "apiFailures": 1
  }
}
```

---

## 🔧 Advanced Features

### Headful Mode (See the Browser)

Edit `debug-browser.ts`:

```typescript
browser = await chromium.launch({
  headless: false,  // ← Change to false
  slowMo: 1000,     // ← Slow down by 1 second per action
});
```

Then run as normal. You'll see Chrome open and watch it work.

### Custom Tests

Add your own test scenarios to `debug-browser.ts`:

```typescript
// Test template selection
await page.click('[data-testid="template-button"]');
await page.waitForTimeout(500);
await page.screenshot({ path: 'debug-output/template-modal.png' });

// Test settings
await page.click('[data-testid="settings-button"]');
await page.waitForTimeout(500);
await page.screenshot({ path: 'debug-output/settings.png' });
```

### Continuous Monitoring

Run periodically to catch regressions:

```bash
# Every 5 minutes (macOS/Linux)
watch -n 300 'cd frontend/schema-authoring && pnpm run debug:browser'
```

---

## 🎯 Integration with Development

### During Development

```bash
# Terminal 1: Run app
pnpm run dev:full

# Terminal 2: Watch for changes and auto-debug
nodemon --watch src --exec "pnpm run debug:browser"
```

### Before Commits

```bash
# Quick health check
pnpm run debug:browser

# Only proceed if summary shows ✅
if grep -q "✅ No major issues" debug-output/debug-summary.txt; then
  git commit
else
  echo "⚠️ Issues detected! Review debug-output/debug-summary.txt"
fi
```

### CI/CD Integration

Add to `.github/workflows/test.yml`:

```yaml
- name: Run Debug Test
  run: |
    cd frontend/schema-authoring
    pnpm run dev:full &
    sleep 5
    pnpm run debug:browser
    
- name: Upload Debug Artifacts
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: debug-output
    path: frontend/schema-authoring/debug-output/
```

---

## 🐛 Troubleshooting

### Debug Tool Issues

**Issue**: `playwright: command not found`
```bash
pnpm run debug:install
```

**Issue**: `Error: browserType.launch: Executable doesn't exist`
```bash
pnpm exec playwright install chromium
```

**Issue**: `Navigation timeout`
- App not running
- Solution: `pnpm run dev:full` first

**Issue**: `Connection refused on localhost:3003`
- Wrong port or app not started
- Solution: Check `pnpm run dev:full` output

### Application Issues

**Issue**: High error count in summary
- Review `CONSOLE ERRORS` section
- Check `debug-report.json` for details
- Look at screenshots for visual state

**Issue**: API failures detected
- API server not running
- Solution: `pnpm run dev:full` (not just `pnpm run dev`)

**Issue**: WASM initialization warnings
- Normal if WASM not built
- App falls back to Node converter
- Optional: `pnpm run build:wasm`

---

## 📚 Related Documentation

- [RUNNING.md](./RUNNING.md) - How to run the servers
- [DEBUG_GUIDE.md](./DEBUG_GUIDE.md) - Detailed debug tool usage
- [FIXES_APPLIED.md](./FIXES_APPLIED.md) - Recent fixes and changes
- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide

---

## 🎉 Benefits Summary

| Before | After |
|--------|-------|
| Manual log collection | Automated capture |
| Incomplete information | Complete visibility |
| Time-consuming | Instant results |
| Hard to share | JSON + screenshots |
| Difficult to reproduce | Consistent every time |
| No historical data | Save all reports |
| CI/CD unfriendly | CI/CD ready |

---

## 💡 Pro Tips

1. **Run debug first** - Before reporting issues, run debug tool
2. **Save reports** - Keep historical reports to compare
3. **Automate** - Add to pre-commit hooks or CI
4. **Customize** - Extend `debug-browser.ts` for your use cases
5. **Share** - Send `debug-output/` to others for help

---

## 🚦 Quick Commands Reference

```bash
# Setup (one-time)
pnpm run debug:install

# Run debug
pnpm run debug:browser

# View summary
cat debug-output/debug-summary.txt

# View errors only
jq '.consoleMessages[] | select(.type == "error")' debug-output/debug-report.json

# View API calls
jq '.networkRequests[] | select(.url | contains("/api/"))' debug-output/debug-report.json

# View screenshots
ls -lh debug-output/*.png

# Clean up old reports
rm -rf debug-output/
```

---

## 📞 Example Workflow

### Scenario: "App not working, need to debug"

```bash
# 1. Start app
cd frontend/schema-authoring
pnpm run dev:full

# 2. In another terminal, run debug
pnpm run debug:browser

# 3. Check summary for issues
cat debug-output/debug-summary.txt

# 4. If errors found, get details
jq '.consoleMessages[] | select(.type == "error")' debug-output/debug-report.json

# 5. Check network failures
jq '.networkRequests[] | select(.status >= 400)' debug-output/debug-report.json

# 6. Look at screenshots
open debug-output/*.png

# 7. Fix issues based on findings

# 8. Re-run debug to verify
pnpm run debug:browser

# 9. Confirm with summary
cat debug-output/debug-summary.txt
# Should now show: ✅ No major issues detected!
```

---

**Result**: You now have complete visibility into the browser without any manual work!

Happy debugging! 🐛✨