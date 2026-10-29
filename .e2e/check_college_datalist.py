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

    # Artist signup — college student input
    page.get_by_role("button", name="+ Sign up as new Artist").click()
    page.wait_for_selector("#signup-submit-btn")
    page.check("#signup-college-student")
    page.wait_for_selector("#signup-artist-college")
    page.click("#signup-artist-college")
    page.fill("#signup-artist-college", "Hind")
    items = options(page)
    print("artist signup matches:", items)
    # click the suggestion, verify it lands in the input
    page.locator("#kala-college-listbox li", has_text="Hindu College").click()
    print("picked value:", page.input_value("#signup-artist-college"))
    print("listbox closed:", page.locator("#kala-college-listbox").count() == 0)
    # dropdown anchored inside the form (below the input, same left edge)
    page.click("#signup-artist-college")
    box_input = page.locator("#signup-artist-college").bounding_box()
    box_list = page.locator("#kala-college-listbox").bounding_box()
    print("anchored:", abs(box_list["x"] - box_input["x"]) < 2 and box_list["y"] >= box_input["y"] + box_input["height"] - 2)

    # Organiser signup — society input
    page.reload(); page.wait_for_load_state("networkidle")
    page.wait_for_selector("text=Select Your Workspace to Log In", timeout=20000)
    page.get_by_role("button", name="+ Register Cultural Venue").click()
    page.wait_for_selector("#signup-submit-btn")
    page.click("#signup-org-type-society")
    page.wait_for_selector("#signup-college-name")
    page.click("#signup-college-name")
    page.fill("#signup-college-name", "Jawaharlal")
    print("society matches:", options(page))
    browser.close()
print("DONE")
