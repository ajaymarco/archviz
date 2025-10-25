const { test, expect } = require('@playwright/test');

test('DXF file loading and rendering', async ({ page }) => {
  await page.goto('file://' + __dirname + '/index.html');

  // Right-click to open the context menu and add a "Load DXF" node
  await page.locator('#canvas-container').click({ button: 'right', position: { x: 200, y: 200 } });
  await page.getByText('Load DXF').click();

  // Right-click to open the context menu and add a "Viewer" node
  await page.locator('#canvas-container').click({ button: 'right', position: { x: 500, y: 200 } });
  await page.locator('#context-menu').getByText('Output').click();

  // Create a connection
  const outputPort = page.locator('.workflow-node[id="node-0"] .port.output .port-dot');
  const inputPort = page.locator('.workflow-node[id="node-1"] .port.input .port-dot');
  await outputPort.hover();
  await page.mouse.down();
  await inputPort.hover();
  await page.mouse.up();

  // Upload the DXF file
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.locator('.workflow-node[id="node-0"] input[type="file"]').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles('test.dxf');

  // Wait for the scene to update
  await page.waitForTimeout(1000);

  // Take a screenshot
  await page.screenshot({ path: 'dxf_load_test.png' });
});
