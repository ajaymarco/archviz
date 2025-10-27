from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Navigate to the local file
    page.goto("file:///app/index.html")
    page.wait_for_load_state('networkidle')

    # Create a few nodes
    page.locator('[data-type="box"]').drag_to(page.locator('#canvas-container'), target_position={'x': 200, 'y': 150}, force=True)
    page.locator('[data-type="sphere"]').drag_to(page.locator('#canvas-container'), target_position={'x': 200, 'y': 350}, force=True)
    page.locator('[data-type="transform"]').drag_to(page.locator('#canvas-container'), target_position={'x': 500, 'y': 250}, force=True)

    # Connect the nodes
    page.locator('#node-0 .port-dot[data-port="0"][data-type="output"]').click()
    page.locator('#node-2 .port-dot[data-port="0"][data-type="input"]').click()
    page.locator('#node-1 .port-dot[data-port="0"][data-type="output"]').click()
    page.locator('#node-2 .port-dot[data-port="1"][data-type="input"]').click()

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)