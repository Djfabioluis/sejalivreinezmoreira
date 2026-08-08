import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
import json
import os

SCREENSHOTS = Path("/tmp/browser/crm_sim")
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # Auth injection
        storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
        session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
        
        await page.goto("http://localhost:8080")
        if storage_key and session_json:
            await page.evaluate(
                f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
            )
        
        # Go to CRM
        await page.goto("http://localhost:8080/crm")
        await page.wait_for_load_state("networkidle")
        
        await page.screenshot(path=str(SCREENSHOTS / "1_crm_dashboard.png"))
        print("Opened CRM dashboard")

        # Check for button
        simulate_btn = page.get_by_role("button", name="Simular cliente real")
        if await simulate_btn.is_visible():
            print("Button 'Simular cliente real' is visible")
            await simulate_btn.click()
            await page.wait_for_timeout(500)
            await page.screenshot(path=str(SCREENSHOTS / "2_simulation_modal.png"))
            
            # Check for modal elements
            modal_title = page.get_by_text("Simular cliente real", exact=True)
            if await modal_title.is_visible():
                print("Simulation modal opened successfully")
                
                # Check for input and select
                phone_input = page.locator("#phone")
                scenario_select = page.locator("#scenario")
                
                if await phone_input.is_visible() and await scenario_select.is_visible():
                    print("Modal inputs are visible")
                else:
                    print("Modal inputs NOT found")
            else:
                print("Modal title NOT found")
        else:
            print("Button 'Simular cliente real' NOT found")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
