from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
SHOT = r"C:\dev\kala_web\.e2e\college_inline.png"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.set_default_timeout(20000)
    page.goto(BASE); page.wait_for_load_state("networkidle")
    page.wait_for_selector("text=Select Your Workspace to Log In", timeout=20000)
    page.get_by_role("button", name="+ Sign up as new Artist").click()
    page.wait_for_selector("#signup-submit-btn")
    page.check("#signup-college-student")
    page.wait_for_selector("#signup-artist-college")
    page.click("#signup-artist-college")
    page.fill("#signup-artist-college", "Del")
    page.wait_for_selector("#kala-college-listbox")
    page.screenshot(path=SHOT, full_page=False)
    # assert list is in-flow: the email field below must be pushed down (list y between input bottom and email label top)
    li = page.locator("#signup-college-student").bounding_box()
    ul = page.locator("#kala-college-listbox").bounding_box()
    print("list below input:", ul["y"] >= li["y"])
    print("screenshot:", SHOT)
    browser.close()
