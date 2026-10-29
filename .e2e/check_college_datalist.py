from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.set_default_timeout(20000)
    page.goto(BASE); page.wait_for_load_state("networkidle")
    page.wait_for_selector("text=Select Your Workspace to Log In", timeout=20000)

    # Artist signup — college student checkbox reveals college input
    page.get_by_role("button", name="+ Sign up as new Artist").click()
    page.wait_for_selector("#signup-submit-btn")
    page.check("#signup-college-student")
    page.wait_for_selector("#signup-artist-college")
    page.fill("#signup-artist-college", "Hind")
    opts = page.evaluate("""() => {
      const dl = document.getElementById('kala-college-options');
      if (!dl) return null;
      return [...dl.querySelectorAll('option')].map(o => o.value);
    }""")
    print("artist signup datalist options:", len(opts) if opts else None)
    print("matches 'Hind':", [o for o in (opts or []) if 'hind' in o.lower()])
    print("input list attr:", page.get_attribute("#signup-artist-college", "list"))

    # Organiser signup — society toggle reveals college input
    page.reload(); page.wait_for_load_state("networkidle")
    page.wait_for_selector("text=Select Your Workspace to Log In", timeout=20000)
    page.get_by_role("button", name="+ Register Cultural Venue").click()
    page.wait_for_selector("#signup-submit-btn")
    page.click("#signup-org-type-society")
    page.wait_for_selector("#signup-college-name")
    print("society input list attr:", page.get_attribute("#signup-college-name", "list"))
    print("datalist present:", page.evaluate("() => !!document.getElementById('kala-college-options')"))
    browser.close()
print("DONE")
