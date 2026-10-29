from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"

def options(page):
    page.wait_for_selector("#kala-college-listbox", timeout=5000)
    return page.evaluate("""() =>
      [...document.querySelectorAll('#kala-college-listbox li')].map(li => li.textContent.trim())
    """)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.set_default_timeout(20000)
    page.goto(BASE); page.wait_for_load_state("networkidle")
    page.wait_for_selector("text=Select Your Workspace to Log In", timeout=20000)

    # Artist signup — listed college
    page.get_by_role("button", name="+ Sign up as new Artist").click()
    page.wait_for_selector("#signup-submit-btn")
    page.check("#signup-college-student")
    page.wait_for_selector("#signup-artist-college")
    page.click("#signup-artist-college")
    page.fill("#signup-artist-college", "Hind")
    items = options(page)
    print("matches:", items)
    assert items[-1] == "Not in the list? Type it yourself", "other-row missing"
    page.locator("#kala-college-listbox li", has_text="Hindu College").click()
    print("picked:", page.input_value("#signup-artist-college"))

    # Unlisted college — zero matches, other-row only, keep typing after click
    page.fill("#signup-artist-college", "My Fake College of Arts")
    items = options(page)
    print("zero-match items:", items)
    assert items == ["Not in the list? Type it yourself"], "expected only other-row"
    page.locator("#kala-college-listbox li").click()
    print("value kept:", page.input_value("#signup-artist-college"))
    print("list closed:", page.locator("#kala-college-listbox").count() == 0)
    print("focus retained:", page.evaluate("() => document.activeElement.id") == "signup-artist-college")

    # Organiser society signup — other-row present
    page.reload(); page.wait_for_load_state("networkidle")
    page.wait_for_selector("text=Select Your Workspace to Log In", timeout=20000)
    page.get_by_role("button", name="+ Register Cultural Venue").click()
    page.wait_for_selector("#signup-submit-btn")
    page.click("#signup-org-type-society")
    page.wait_for_selector("#signup-college-name")
    page.click("#signup-college-name")
    page.fill("#signup-college-name", "zzzz")
    items = options(page)
    print("society zero-match items:", items)
    assert items == ["Not in the list? Type it yourself"], "society other-row missing"
    browser.close()
print("ALL PASSED")
