
import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Set a consistent viewport size
        await page.set_viewport_size({"width": 1280, "height": 720})

        # Navigate to the local HTML file
        await page.goto(f"file://{os.path.abspath('index.html')}")

        # The drop target should be the container, not the canvas div itself which has no size initially
        drop_target = '#canvas-container'

        # Drag and drop nodes to create a workflow with a horizontal layout to prevent overlap
        await page.drag_and_drop('div.palette-node[data-type="box"]', drop_target, target_position={'x': 50, 'y': 100})
        await page.drag_and_drop('div.palette-node[data-type="box"]', drop_target, target_position={'x': 50, 'y': 350})
        await page.drag_and_drop('div.palette-node[data-type="subtract"]', drop_target, target_position={'x': 300, 'y': 225})
        await page.drag_and_drop('div.palette-node[data-type="output"]', drop_target, target_position={'x': 550, 'y': 225})


        # Wait for the last node to be rendered
        await page.wait_for_selector('#node-3')

        # Connect the nodes
        # Box 1 to Subtract A
        await page.locator('#node-0 .port.output .port-dot').click()
        await page.locator('#node-2 .port.input .port-dot[data-port="0"]').click()

        # Box 2 to Subtract B
        await page.locator('#node-1 .port.output .port-dot').click()
        await page.locator('#node-2 .port.input .port-dot[data-port="1"]').click()

        # Subtract Result to Output Geometry
        await page.locator('#node-2 .port.output .port-dot').click()
        await page.locator('#node-3 .port.input .port-dot').click()

        # Generate the model
        await page.locator('button.btn-primary:has-text("Generate Model")').click()

        # Wait for the model to be generated (give it a second for rendering)
        await page.wait_for_timeout(1000)

        # Take a screenshot of the viewport
        await page.locator('#viewport').screenshot(path="jules-scratch/verification/topo_sort_test.png")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
