"""Responsive audit: seed real data, screenshot every tab at 375/768/1440."""
import os, sys, time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
TS = str(int(time.time()))
ORG_EMAIL = f"audit-org-{TS}@example.com"
ART_EMAIL = f"audit-artist-{TS}@example.com"
PW = "E2eTest123!"
CALL_TITLE = f"Audit Open Call {TS}"
SHOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audit")
os.makedirs(SHOT, exist_ok=True)

WIDTHS = [(375, 812, "mobile"), (768, 1024, "tablet"), (1440, 900, "desktop")]

def wait_loaded(page):
    page.wait_for_selector("text=Loading your workspace", state="detached", timeout=45000)

def wait_logged_in(page):
    page.wait_for_selector("#user-profile-menu-btn", state="visible", timeout=60000)
    page.wait_for_timeout(800)

def open_signup(page, which):
    page.wait_for_selector("text=Select Your Workspace to Log In", timeout=20000)
    page.get_by_role("button", name=which).click()
    page.wait_for_selector("#signup-submit-btn", timeout=10000)

def sign_out(page):
    page.click("#user-profile-menu-btn")
    page.get_by_role("button", name="Log Out of Supabase Session").click()
    page.wait_for_selector("text=Select Your Workspace to Log In", timeout=20000)

def login(page, email, portal):
    page.get_by_role("button", name="Log In with Email").nth(0 if portal == "artist" else 1).click()
    page.wait_for_selector('input[type="email"]', timeout=10000)
    page.locator('input[type="email"]').first.fill(email)
    page.locator('input[type="password"]').first.fill(PW)
    page.get_by_role("button", name=f"Sign In to {'Artist' if portal=='artist' else 'Organiser'} Portal").click()

def overflow_px(page):
    return page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")

def seed(page):
    page.goto(BASE); page.wait_for_load_state("networkidle"); wait_loaded(page)
    open_signup(page, "+ Register Cultural Venue")
    page.fill("#signup-name", "Audit Curator")
    page.fill("#signup-email", ORG_EMAIL)
    page.fill("#signup-password", PW)
    page.fill("#signup-confirm-password", PW)
    page.locator("#signup-org-name").fill("Audit Theatre Co")
    page.click("#signup-submit-btn")
    page.wait_for_selector("text=Post Production Call", timeout=60000)
    page.get_by_role("button", name="Post Production Call").click()
    page.wait_for_selector("#post-title", timeout=10000)
    page.fill("#post-title", CALL_TITLE)
    page.fill("#post-venue", "Audit Amphitheatre")
    page.fill("#post-city", "Pune, Maharashtra")
    page.fill("#post-start-date", "2026-11-20")
    page.fill("#post-end-date", "2026-11-22")
    page.fill("#post-description", "A short audit description used to seed the responsive audit with realistic pipeline data.")
    page.get_by_label("Minimum honorarium").fill("5000")
    page.get_by_label("Maximum honorarium").fill("12000")
    page.locator("div.flex.gap-2.overflow-x-auto button").first.click()
    page.wait_for_timeout(400)
    page.get_by_role("button", name="Publish Call").click()
    page.wait_for_selector(f"text={CALL_TITLE}", timeout=30000)
    sign_out(page)

    open_signup(page, "+ Sign up as new Artist")
    page.fill("#signup-name", "Audit Artist")
    page.fill("#signup-email", ART_EMAIL)
    page.fill("#signup-password", PW)
    page.fill("#signup-confirm-password", PW)
    page.fill("#signup-discipline", "Sitarist")
    page.click("#signup-submit-btn")
    wait_logged_in(page)
    page.get_by_role("button", name="Discover").first.click()
    page.wait_for_timeout(1500)
    card = page.locator("text=" + CALL_TITLE).first.locator(
        "xpath=ancestor::div[contains(@class,'group') or contains(@class,'rounded')][1]"
    ).get_by_role("button", name="Apply Now")
    card.first.click()
    page.wait_for_selector("text=Submit Application", timeout=10000)
    page.locator('input[placeholder="e.g. 4"]').fill("6")
    page.locator('input[placeholder="e.g. Mumbai"]').fill("Mumbai")
    page.locator('input[placeholder*="Carnatic Vocals"]').fill("Sitar, Raga")
    page.locator('textarea[placeholder*="Briefly introduce"]').fill("Audit test pitch with a reasonably long line to exercise text wrapping behaviour on small screens in the pipeline cards.")
    page.get_by_role("button", name="Submit Application").click()
    page.wait_for_selector("text=Submit Application", state="detached", timeout=30000)
    sign_out(page)

    login(page, ORG_EMAIL, "organiser")
    page.wait_for_selector("text=Post Production Call", timeout=60000)
    page.wait_for_timeout(2000)
    page.get_by_role("button", name="Talent Pipeline").first.click()
    page.wait_for_timeout(1200)
    page.get_by_role("button", name="Under Review (1)").click()
    page.wait_for_timeout(600)
    page.get_by_role("button", name="Commission Artist").click()
    page.get_by_role("button", name="All Submissions (1)").click()
    page.wait_for_selector("text=Artist Selected", timeout=30000)
    try:
        page.locator('button[title="Rate 4 stars"]').first.click()
        page.wait_for_timeout(500)
    except Exception:
        pass

def shoot_all_tabs(page, portal, tag):
    tabs = (["Overview", "Manage Calls", "Talent Pipeline", "Direct Scout", "Organiser Profile"]
            if portal == "organiser" else
            ["Home", "Discover", "Applications", "Profile"])
    for tab in tabs:
        try:
            page.get_by_role("button", name=tab).first.click()
        except Exception:
            if tab == "Talent Pipeline":
                page.get_by_role("button", name="Pipeline").first.click()
            else:
                print(f"  nav fail {portal}/{tab}", flush=True)
                continue
        page.wait_for_timeout(1300)
        ov = overflow_px(page)
        name = f"{tag}_{portal}_{tab.replace(' ', '-').lower()}.png"
        page.screenshot(path=os.path.join(SHOT, name), full_page=True)
        flag = "OVERFLOW" if ov > 2 else "ok"
        print(f"  {name}: scrollOverflow={ov}px [{flag}]", flush=True)

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.set_default_timeout(20000)
        print("seeding data...", flush=True)
        seed(page)

        for w, h, tag in WIDTHS:
            print(f"\n== {tag} {w}x{h} ==", flush=True)
            page.set_viewport_size({"width": w, "height": h})
            shoot_all_tabs(page, "organiser", tag)
            sign_out(page)
            login(page, ART_EMAIL, "artist")
            wait_logged_in(page)
            shoot_all_tabs(page, "artist", tag)
            sign_out(page)
            login(page, ORG_EMAIL, "organiser")
            wait_logged_in(page)

        browser.close()
    print("\nDONE", flush=True)

if __name__ == "__main__":
    main()
