/**
 * Browser Debug Script
 *
 * Uses Playwright to launch the app, capture all console logs, network activity,
 * and screenshots, then writes detailed reports that can be analyzed.
 *
 * Usage:
 *   pnpm add -D playwright @playwright/test
 *   pnpm exec playwright install chromium
 *   tsx debug-browser.ts
 */

import {
  chromium,
  Browser,
  Page,
  ConsoleMessage,
  Request,
  Response,
} from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

interface DebugReport {
  timestamp: string;
  url: string;
  consoleMessages: {
    timestamp: string;
    type: string;
    text: string;
    location?: string;
    args?: string[];
  }[];
  networkRequests: {
    timestamp: string;
    method: string;
    url: string;
    status?: number;
    statusText?: string;
    timing?: number;
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    postData?: string;
    responseBody?: string;
  }[];
  errors: {
    timestamp: string;
    message: string;
    stack?: string;
  }[];
  pageMetrics: {
    loadTime?: number;
    domContentLoaded?: number;
    firstContentfulPaint?: number;
  };
  screenshots: string[];
  summary: {
    totalConsoleMessages: number;
    errorCount: number;
    warningCount: number;
    networkRequests: number;
    failedRequests: number;
    apiCalls: number;
    apiFailures: number;
  };
}

async function main() {
  const report: DebugReport = {
    timestamp: new Date().toISOString(),
    url: "http://localhost:3003",
    consoleMessages: [],
    networkRequests: [],
    errors: [],
    pageMetrics: {},
    screenshots: [],
    summary: {
      totalConsoleMessages: 0,
      errorCount: 0,
      warningCount: 0,
      networkRequests: 0,
      failedRequests: 0,
      apiCalls: 0,
      apiFailures: 0,
    },
  };

  console.log("🚀 Starting browser debug session...\n");

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Create output directory
    const outputDir = join(process.cwd(), "debug-output");
    mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Output directory: ${outputDir}\n`);

    // Launch browser
    console.log("🌐 Launching Chromium...");
    browser = await chromium.launch({
      headless: true, // Set to false to see the browser
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    page = await browser.newPage();

    // Set viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Capture console messages
    page.on("console", (msg: ConsoleMessage) => {
      const timestamp = new Date().toISOString();
      const type = msg.type();
      const text = msg.text();
      const location = msg.location();

      const entry = {
        timestamp,
        type,
        text,
        location: location.url
          ? `${location.url}:${location.lineNumber}:${location.columnNumber}`
          : undefined,
        args: msg.args().map((arg) => arg.toString()),
      };

      report.consoleMessages.push(entry);

      // Also print to our console with color coding
      const icon =
        type === "error"
          ? "❌"
          : type === "warning"
            ? "⚠️"
            : type === "info"
              ? "ℹ️"
              : "📝";
      console.log(`${icon} [${type.toUpperCase()}] ${text}`);

      if (type === "error") {
        report.summary.errorCount++;
      } else if (type === "warning") {
        report.summary.warningCount++;
      }
    });

    // Capture page errors
    page.on("pageerror", (error: Error) => {
      const timestamp = new Date().toISOString();
      report.errors.push({
        timestamp,
        message: error.message,
        stack: error.stack,
      });
      console.log(`💥 PAGE ERROR: ${error.message}`);
    });

    // Capture network requests
    page.on("request", (request: Request) => {
      const timestamp = new Date().toISOString();
      const url = request.url();
      const method = request.method();

      console.log(`📤 ${method} ${url}`);

      const entry: any = {
        timestamp,
        method,
        url,
        requestHeaders: request.headers(),
      };

      // Capture POST data
      if (method === "POST" && request.postData()) {
        entry.postData = request.postData();
      }

      report.networkRequests.push(entry);
      report.summary.networkRequests++;

      if (url.includes("/api/")) {
        report.summary.apiCalls++;
      }
    });

    // Capture network responses
    page.on("response", async (response: Response) => {
      const url = response.url();
      const status = response.status();
      const statusText = response.statusText();
      const request = response.request();

      const icon = status >= 400 ? "❌" : status >= 300 ? "🔄" : "✅";
      console.log(`${icon} ${status} ${statusText} ${url}`);

      // Find the matching request entry
      const requestEntry = report.networkRequests.find(
        (r) => r.url === url && !r.status,
      );

      if (requestEntry) {
        requestEntry.status = status;
        requestEntry.statusText = statusText;
        requestEntry.responseHeaders = response.headers();
        requestEntry.timing = Date.now();

        // Try to capture response body for API calls
        if (url.includes("/api/")) {
          try {
            const body = await response.text();
            requestEntry.responseBody = body;
          } catch (e) {
            requestEntry.responseBody = "<failed to read>";
          }
        }

        if (status >= 400) {
          report.summary.failedRequests++;
          if (url.includes("/api/")) {
            report.summary.apiFailures++;
          }
        }
      }
    });

    // Navigate to the app
    console.log("\n🔗 Navigating to app...");
    const startTime = Date.now();

    try {
      await page.goto(report.url, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      const loadTime = Date.now() - startTime;
      report.pageMetrics.loadTime = loadTime;
      console.log(`✅ Page loaded in ${loadTime}ms\n`);
    } catch (error) {
      console.log(
        `❌ Navigation failed: ${error instanceof Error ? error.message : error}\n`,
      );
    }

    // Wait for React to mount
    console.log("⏳ Waiting for app to initialize...");
    await page.waitForTimeout(3000);

    // Take screenshot of initial state
    const screenshotPath1 = join(outputDir, "screenshot-initial.png");
    await page.screenshot({ path: screenshotPath1, fullPage: true });
    report.screenshots.push(screenshotPath1);
    console.log(`📸 Screenshot saved: ${screenshotPath1}`);

    // Check for Monaco editors
    console.log("\n🔍 Checking for Monaco editors...");
    const editorSelectors = [
      ".monaco-editor",
      '[data-mode-id="json"]',
      '[data-mode-id="graphql"]',
      '[class*="editor"]',
    ];

    for (const selector of editorSelectors) {
      const count = await page.locator(selector).count();
      console.log(`   ${selector}: ${count} found`);
    }

    // Get app state from window object
    console.log("\n🔍 Checking app state...");
    const appState = await page.evaluate(() => {
      const win = window as any;
      return {
        hasSchemaAuthoringAPI: !!win.__schemaAuthoringAPI__,
        hasMonaco: !!win.monaco,
        reactVersion:
          typeof win.React !== "undefined" ? "loaded" : "not loaded",
      };
    });
    console.log(
      `   Schema Authoring API: ${appState.hasSchemaAuthoringAPI ? "✅" : "❌"}`,
    );
    console.log(`   Monaco: ${appState.hasMonaco ? "✅" : "❌"}`);
    console.log(`   React: ${appState.reactVersion}`);

    // Try to trigger a conversion
    console.log("\n🧪 Attempting to trigger conversion...");
    try {
      const testSchema = {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
      };

      await page.evaluate((schema) => {
        const win = window as any;
        if (win.__schemaAuthoringAPI__) {
          const api = win.__schemaAuthoringAPI__.getAPI();
          api.setJsonSchema(JSON.stringify(schema, null, 2));
          return api.convert();
        }
        return null;
      }, testSchema);

      console.log("✅ Conversion triggered via API");

      // Wait for conversion to complete
      await page.waitForTimeout(2000);

      // Take screenshot after conversion
      const screenshotPath2 = join(
        outputDir,
        "screenshot-after-conversion.png",
      );
      await page.screenshot({ path: screenshotPath2, fullPage: true });
      report.screenshots.push(screenshotPath2);
      console.log(`📸 Screenshot saved: ${screenshotPath2}`);
    } catch (error) {
      console.log(
        `⚠️ Conversion test failed: ${error instanceof Error ? error.message : error}`,
      );
    }

    // Get converter status
    console.log("\n🔍 Checking converter status...");
    const converterStatus = await page.evaluate(() => {
      const win = window as any;
      if (win.__schemaAuthoringAPI__) {
        const api = win.__schemaAuthoringAPI__.getAPI();
        const state = api.getStateSnapshot();
        return {
          hasState: true,
          converterEngine: state.settings?.converterEngine,
          hasJsonSchema: !!state.jsonSchemaEditor?.content,
          hasGraphQL: !!state.graphqlEditor?.content,
          errorCount: state.jsonSchemaEditor?.errors?.length || 0,
          warningCount: state.jsonSchemaEditor?.warnings?.length || 0,
        };
      }
      return { hasState: false };
    });
    console.log(
      "   Converter state:",
      JSON.stringify(converterStatus, null, 2),
    );

    // Wait a bit more to catch any delayed messages
    console.log("\n⏳ Waiting for delayed messages...");
    await page.waitForTimeout(2000);
  } catch (error) {
    console.error("\n💥 Error during debug session:", error);
    report.errors.push({
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  } finally {
    // Update summary
    report.summary.totalConsoleMessages = report.consoleMessages.length;

    // Write detailed report
    const outputDir = join(process.cwd(), "debug-output");
    const reportPath = join(outputDir, "debug-report.json");
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Full report saved: ${reportPath}`);

    // Write human-readable summary
    const summaryPath = join(outputDir, "debug-summary.txt");
    const summary = generateSummary(report);
    writeFileSync(summaryPath, summary);
    console.log(`📋 Summary saved: ${summaryPath}`);

    // Close browser
    if (browser) {
      await browser.close();
      console.log("\n✅ Browser closed");
    }

    // Print summary to console
    console.log("\n" + "=".repeat(60));
    console.log("DEBUG SUMMARY");
    console.log("=".repeat(60));
    console.log(summary);
  }
}

function generateSummary(report: DebugReport): string {
  const lines: string[] = [];

  lines.push("Browser Debug Report");
  lines.push("=".repeat(60));
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push(`URL: ${report.url}`);
  lines.push("");

  lines.push("SUMMARY");
  lines.push("-".repeat(60));
  lines.push(`Total Console Messages: ${report.summary.totalConsoleMessages}`);
  lines.push(`  - Errors: ${report.summary.errorCount}`);
  lines.push(`  - Warnings: ${report.summary.warningCount}`);
  lines.push(
    `  - Other: ${report.summary.totalConsoleMessages - report.summary.errorCount - report.summary.warningCount}`,
  );
  lines.push("");
  lines.push(`Network Requests: ${report.summary.networkRequests}`);
  lines.push(`  - Failed: ${report.summary.failedRequests}`);
  lines.push(`  - API Calls: ${report.summary.apiCalls}`);
  lines.push(`  - API Failures: ${report.summary.apiFailures}`);
  lines.push("");
  lines.push(`Page Load Time: ${report.pageMetrics.loadTime || "N/A"}ms`);
  lines.push(`Screenshots: ${report.screenshots.length}`);
  lines.push("");

  if (report.errors.length > 0) {
    lines.push("PAGE ERRORS");
    lines.push("-".repeat(60));
    report.errors.forEach((error, i) => {
      lines.push(`${i + 1}. [${error.timestamp}] ${error.message}`);
      if (error.stack) {
        lines.push(`   ${error.stack.split("\n").slice(0, 3).join("\n   ")}`);
      }
    });
    lines.push("");
  }

  if (report.summary.errorCount > 0) {
    lines.push("CONSOLE ERRORS");
    lines.push("-".repeat(60));
    const errors = report.consoleMessages.filter((m) => m.type === "error");
    errors.slice(0, 10).forEach((msg, i) => {
      lines.push(`${i + 1}. [${msg.timestamp}] ${msg.text}`);
      if (msg.location) {
        lines.push(`   Location: ${msg.location}`);
      }
    });
    if (errors.length > 10) {
      lines.push(`   ... and ${errors.length - 10} more errors`);
    }
    lines.push("");
  }

  if (report.summary.failedRequests > 0) {
    lines.push("FAILED NETWORK REQUESTS");
    lines.push("-".repeat(60));
    const failed = report.networkRequests.filter(
      (r) => r.status && r.status >= 400,
    );
    failed.forEach((req, i) => {
      lines.push(`${i + 1}. ${req.method} ${req.url}`);
      lines.push(`   Status: ${req.status} ${req.statusText}`);
      if (req.responseBody) {
        const body = req.responseBody.slice(0, 200);
        lines.push(
          `   Response: ${body}${req.responseBody.length > 200 ? "..." : ""}`,
        );
      }
    });
    lines.push("");
  }

  lines.push("API CALLS");
  lines.push("-".repeat(60));
  const apiCalls = report.networkRequests.filter((r) =>
    r.url.includes("/api/"),
  );
  if (apiCalls.length === 0) {
    lines.push("No API calls detected");
  } else {
    apiCalls.forEach((req, i) => {
      lines.push(`${i + 1}. ${req.method} ${req.url}`);
      lines.push(
        `   Status: ${req.status || "pending"} ${req.statusText || ""}`,
      );
      if (req.postData) {
        lines.push(`   Request: ${req.postData.slice(0, 100)}...`);
      }
      if (req.responseBody) {
        lines.push(`   Response: ${req.responseBody.slice(0, 100)}...`);
      }
    });
  }
  lines.push("");

  lines.push("RECOMMENDATIONS");
  lines.push("-".repeat(60));
  if (report.summary.apiFailures > 0) {
    lines.push("⚠️ API requests are failing - check if API server is running");
  }
  if (report.summary.errorCount > 5) {
    lines.push("⚠️ High error count - review console errors above");
  }
  if (report.pageMetrics.loadTime && report.pageMetrics.loadTime > 5000) {
    lines.push("⚠️ Slow page load - check network and bundle size");
  }
  if (report.summary.errorCount === 0 && report.summary.apiFailures === 0) {
    lines.push("✅ No major issues detected!");
  }

  return lines.join("\n");
}

// Run the debug session
main().catch(console.error);
