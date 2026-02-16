import { test, expect } from '@playwright/test';


// Basic smoke tests for Schema Authoring UI
test.describe('Schema Authoring - smoke', () => {
  test('app mounts and exposes AI API', async ({ page }) => {
    await page.goto('http://localhost:3003', { waitUntil: 'networkidle' });

    // Wait for root element to mount
    await page.waitForSelector('#root');

    const hasAPI = await page.evaluate(() => !!(window as any).__schemaAuthoringAPI__);
    expect(hasAPI).toBe(true);

    const apiSnapshot = await page.evaluate(async () => {
      const api = (window as any).__schemaAuthoringAPI__.getAPI();
      const snapshot = api.getStateSnapshot();
      return {
        hasJson: !!snapshot.jsonSchema,
        hasGraphQL: typeof snapshot.graphqlSchema === 'string',
        settings: snapshot.settings,
      };
    });

    expect(apiSnapshot).toHaveProperty('settings');
  });

  test('monaco editors present and visible', async ({ page }) => {
    await page.goto('http://localhost:3003', { waitUntil: 'networkidle' });

    // Ensure Monaco root elements exist
    await page.waitForSelector('.monaco-editor');
    const editorsCount = await page.locator('.monaco-editor').count();
    expect(editorsCount).toBeGreaterThan(0);

    // Check our split-resizer is present in the DOM
    await expect(page.locator('[data-testid="split-resizer"]')).toHaveCount(1);
  });

  test('can trigger conversion via API (requires node converter health)', async ({ page, request }) => {
    await page.goto('http://localhost:3003', { waitUntil: 'networkidle' });

    // Pre-check: ensure Node converter health endpoint returns 200 before attempting conversion
    let healthy = false;
    try {
      const res = await request.get('http://localhost:3004/health', { timeout: 5000 });
      healthy = res.status() === 200;
    } catch (err) {
      healthy = false;
    }

    if (!healthy) {
      console.warn('Node converter health endpoint not available (http://localhost:3004/health). Skipping conversion step.');
      // Exit the test early to avoid false failures when converter is not running.
      return;
    }

    // If healthy, attempt conversion via in-app API
    const convertResult = await page.evaluate(async () => {
      const api = (window as any).__schemaAuthoringAPI__.getAPI();
      await api.setJsonSchema(JSON.stringify({ type: 'object', properties: { id: { type: 'string' } } }, null, 2));
      const result = await api.convert();
      return result;
    });

    // Expect conversion result to be defined when converter is available
    expect(convertResult).toBeDefined();
  });
});
