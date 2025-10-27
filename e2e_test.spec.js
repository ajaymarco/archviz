
const { test, expect } = require('@playwright/test');
const path = require('path');

test('DXF to Wall and Procedural Transform Workflow', async ({ page }) => {
  // Navigate to the local HTML file
  await page.goto(`file://${path.resolve(__dirname, 'index.html')}`);

  // 1. Create the DXF to Wall workflow
  // Add a "Load DXF" node
  await page.locator('#canvas-container').click({ button: 'right', position: { x: 100, y: 200 } });
  await page.getByText('Load DXF').click();

  // Add a "Wall" node
  await page.locator('#canvas-container').click({ button: 'right', position: { x: 350, y: 200 } });
  await page.getByText('Wall').click();

  // Add an "Output" node
  await page.locator('#canvas-container').click({ button: 'right', position: { x: 600, y: 200 } });
  await page.getByText('Output').click();

  // Connect the nodes
  await page.locator('#node-0 .port.output .port-dot').click();
  await page.locator('#node-1 .port.input .port-dot[data-port="0"]').click();

  await page.locator('#node-1 .port.output .port-dot').click();
  await page.locator('#node-2 .port.input .port-dot').click();

  // Upload the DXF file
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.locator('input[type="file"]').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.resolve(__dirname, 'extrude_test.dxf'));

  // Generate the model and take a screenshot
  await page.getByRole('button', { name: '▶ Generate Model' }).click();
  await page.waitForTimeout(1000); // Wait for rendering
  await expect(page.locator('#viewport')).toHaveScreenshot('dxf-wall-test.png');

  // 2. Test Procedural Transform
  // Clear the canvas
  await page.getByRole('button', { name: 'Clear All' }).click();
  await page.once('dialog', dialog => dialog.accept());


  // Add a Box node
  await page.locator('#canvas-container').click({ button: 'right', position: { x: 100, y: 100 } });
  await page.getByText('Box').click();

  // Add Vector nodes for translation, rotation, and scale
  await page.locator('#canvas-container').click({ button: 'right', position: { x: 100, y: 250 } });
  await page.getByText('Vector').click();

  // Add a Compose Transform node
  await page.locator('#canvas-container').click({ button: 'right', position: { x: 300, y: 250 } });
  await page.getByText('Compose Transform').click();

  // Add a Transform node
  await page.locator('#canvas-container').click({ button: 'right', position: { x: 500, y: 100 } });
  await page.getByText('Transform').click();

  // Add an Output node
  await page.locator('#canvas-container').click({ button: 'right', position: { x: 700, y: 100 } });
  await page.getByText('Output').click();

  // Connect the nodes
  await page.locator('#node-4 .port.output .port-dot').click(); // Box to Transform
  await page.locator('#node-7 .port.input .port-dot[data-port="0"]').click();

  await page.locator('#node-5 .port.output .port-dot').click(); // Vector to Compose Transform
  await page.locator('#node-6 .port.input .port-dot[data-port="0"]').click();

  await page.locator('#node-6 .port.output .port-dot').click(); // Compose Transform to Transform
  await page.locator('#node-7 .port.input .port-dot[data-port="1"]').click();

  await page.locator('#node-7 .port.output .port-dot').click(); // Transform to Output
  await page.locator('#node-8 .port.input .port-dot').click();


  // Set vector values
  await page.locator('#node-5 input[data-param="y"]').fill('10');

  // Generate and take screenshot
  await page.getByRole('button', { name: '▶ Generate Model' }).click();
  await page.waitForTimeout(1000);
  await expect(page.locator('#viewport')).toHaveScreenshot('procedural-transform-test.png');
});
