"""Repro 3: hard-reload persistence with real render checks (naturalWidth)."""
import os, sys, time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
TS = str(int(time.time()))
ART_EMAIL = f"repro3-artist-{TS}@example.com"
ORG_EMAIL = f"repro3-org-{TS}@example.com"
PW = "E2eTest123!"
IMG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test-avatar.png")

def wait_loaded(page):
    page.wait_for_selector("text=Loading your workspace", state="detached", timeout=45000)

def header_img_info(page):
    return page.evaluate("""() => {
        const btn = document.querySelector('#user-profile-menu-btn');
        const img = btn && btn.querySelector('img');
        if (!img) return null;
        return { src: img.src, complete: img.complete, w: img.naturalWidth };
    }""")

def open_signup(page, which):
    page.wait_for_selector("text=Select Your Workspace to Log In", timeout=20000)
    page.get_by_role("button", name=which).click()
    page.wait_for_selector("#signup-submit-btn", timeout=10000)

def signup_with_avatar(page, name, email, org=None):
    open_signup(page, "+ Register Cultural Venue" if org else "+ Sign up as new Artist")
    if org: page.fill("#signup-org-name", org)
    page.fill("#signup-name", name)
    page.fill("#signup-email", email)
    page.fill("#signup-password", PW)
    page.fill("#signup-confirm-password", PW)
    page.locator('input[type=file]').first.set_input_files(IMG)
    page.wait_for_timeout(400)
    btn = page.get_by_role("button", name="Confirm & Upload")
    if btn.count() > 0:
        btn.first.click()
        page.wait_for_timeout(3500)
    page.click("#signup-submit-btn")

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

def main():
    failures = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.set_default_timeout(20000)

        # ---- A: artist signup w/ avatar -> HARD RELOAD (fresh session boot) ----
        print("== A: artist signup with avatar, then hard reload ==", flush=True)
        page.goto(BASE); page.wait_for_load_state("networkidle"); wait_loaded(page)
        signup_with_avatar(page, "Repro3 Artist", ART_EMAIL)
        page.wait_for_selector("text=Discover", timeout=60000)
        page.wait_for_timeout(2500)
        info1 = header_img_info(page)
        print("after signup:", info1, flush=True)

        # simulate browser restart: full reload
        page.reload(); page.wait_for_load_state("networkidle"); wait_loaded(page)
        page.wait_for_timeout(2500)
        info2 = header_img_info(page)
        print("after hard reload:", info2, flush=True)
        page.screenshot(path=".e2e/repro3_01_artist_after_reload.png")
        if not info2 or not info2["w"]:
            failures.append(f"artist signup avatar broken after reload: {info2}")

        # ---- B: logout (after reload) -> login -> reload again ----
        print("== B: artist logout + login + reload ==", flush=True)
        sign_out(page)
        login(page, ART_EMAIL, "artist")
        page.wait_for_selector("text=Discover", timeout=60000)
        page.wait_for_timeout(2500)
        info3 = header_img_info(page)
        print("after relogin:", info3, flush=True)
        if not info3 or not info3["w"]:
            failures.append(f"artist avatar broken after relogin: {info3}")
        page.reload(); page.wait_for_load_state("networkidle"); wait_loaded(page)
        page.wait_for_timeout(3000)
        info4 = header_img_info(page)
        print("after relogin+reload:", info4, flush=True)
        page.screenshot(path=".e2e/repro3_02_artist_relogin_reload.png")
        if not info4 or not info4["w"]:
            failures.append(f"artist avatar broken after relogin+reload: {info4}")
        if info4 and not info4["src"].startswith("https://"):
            failures.append(f"artist signup avatar not migrated to hosted URL: {info4['src']}")

        # profile page render check
        page.get_by_role("button", name="Profile").first.click()
        page.wait_for_timeout(1500)
        prof = page.evaluate("""() => {
            const img = [...document.querySelectorAll('img')].find(i => (i.alt||'').includes('Profile Avatar'));
            return img ? { src: img.src, w: img.naturalWidth } : null;
        }""")
        print("profile page img:", prof, flush=True)
        if not prof or not prof["w"]:
            failures.append(f"artist profile page avatar broken: {prof}")

        # ---- C: organiser signup w/ avatar -> hard reload ----
        print("== C: organiser signup with avatar, hard reload ==", flush=True)
        sign_out(page)
        page.goto(BASE); page.wait_for_load_state("networkidle"); wait_loaded(page)
        signup_with_avatar(page, "Repro3 Curator", ORG_EMAIL, org="Repro3 Theatre")
        page.wait_for_selector("text=Post Production Call", timeout=60000)
        page.wait_for_timeout(2500)
        o1 = header_img_info(page)
        print("org after signup:", o1, flush=True)
        page.reload(); page.wait_for_load_state("networkidle"); wait_loaded(page)
        page.wait_for_timeout(2500)
        o2 = header_img_info(page)
        print("org after hard reload:", o2, flush=True)
        page.screenshot(path=".e2e/repro3_03_org_after_reload.png")
        if not o2 or not o2["w"]:
            failures.append(f"organiser signup avatar broken after reload: {o2}")

        # organiser profile page logo render
        page.get_by_role("button", name="Profile").first.click()
        page.wait_for_timeout(1500)
        ologo = page.evaluate("""() => {
            const ring = [...document.querySelectorAll('div')].find(d => (d.className||'').includes('ring-4') && (d.className||'').includes('rounded-3xl'));
            const img = ring && ring.querySelector('img');
            return img ? { src: img.src, w: img.naturalWidth } : null;
        }""")
        print("org profile logo:", ologo, flush=True)
        page.screenshot(path=".e2e/repro3_04_org_profile.png")
        if not ologo or not ologo["w"]:
            failures.append(f"organiser profile logo broken after reload: {ologo}")

        browser.close()
    print("\n==== RESULT ====", flush=True)
    if failures:
        for f in failures: print("FAIL:", f, flush=True)
        sys.exit(1)
    print("ALL RENDER CHECKS PASSED", flush=True)

if __name__ == "__main__":
    main()
