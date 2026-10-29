"""Repro 2: signup avatar (local/IndexedDB) + organiser logo persistence."""
import os, sys, time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
TS = str(int(time.time()))
ART_EMAIL = f"repro2-artist-{TS}@example.com"
ORG_EMAIL = f"repro2-org-{TS}@example.com"
PW = "E2eTest123!"
IMG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test-avatar.png")

def wait_loaded(page):
    page.wait_for_selector("text=Loading your workspace", state="detached", timeout=45000)

def header_avatar_src(page):
    return page.evaluate("""() => {
        const btn = document.querySelector('#user-profile-menu-btn');
        const img = btn && btn.querySelector('img');
        return img ? img.src : null;
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
    # avatar uploader inside the signup modal
    page.locator('#signup-submit-btn').locator("xpath=ancestor::div[contains(@class,'modal') or contains(@class,'fixed')][1]").count()
    # find the file input inside the signup modal (the only one)
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

        # ---- A: artist signup with avatar -> logout -> login ----
        print("== A: artist signup with avatar ==", flush=True)
        page.goto(BASE); page.wait_for_load_state("networkidle"); wait_loaded(page)
        signup_with_avatar(page, "Repro2 Artist", ART_EMAIL)
        page.wait_for_selector("text=Discover", timeout=60000)
        page.wait_for_timeout(2500)  # let profile media effect resolve
        src1 = header_avatar_src(page)
        print("artist header after signup:", src1, flush=True)
        meta_ls = page.evaluate("() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('kala_profile_media')))")
        print("artist localStorage:", meta_ls, flush=True)
        idb_keys = page.evaluate("""async () => {
            const db = await new Promise((res, rej) => { const r = indexedDB.open('kala-media'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
            if (!db.objectStoreNames.contains('files')) return [];
            return await new Promise((res) => { const tx = db.transaction('files').objectStore('files').getAllKeys(); tx.onsuccess = () => res(tx.result); });
        }""")
        print("IndexedDB keys:", idb_keys, flush=True)

        print("== A: logout + login ==", flush=True)
        sign_out(page)
        login(page, ART_EMAIL, "artist")
        page.wait_for_selector("text=Discover", timeout=60000)
        page.wait_for_timeout(2500)
        src2 = header_avatar_src(page)
        print("artist header after relogin:", src2, flush=True)
        page.screenshot(path=".e2e/repro2_01_artist_relogin.png")
        if not src2 or src2.startswith("data:") or (src1 and "blob:" in src2):
            failures.append(f"artist signup avatar not persisted: before={src1} after={src2}")
        # profile page check
        page.get_by_role("button", name="Profile").first.click()
        page.wait_for_timeout(1200)
        page.screenshot(path=".e2e/repro2_02_artist_profile.png")

        # ---- B: organiser signup with avatar -> logout -> login ----
        print("== B: organiser signup with avatar ==", flush=True)
        sign_out(page)
        page.goto(BASE); page.wait_for_load_state("networkidle"); wait_loaded(page)
        signup_with_avatar(page, "Repro2 Curator", ORG_EMAIL, org="Repro2 Theatre")
        page.wait_for_selector("text=Post Production Call", timeout=60000)
        page.wait_for_timeout(2500)
        osrc1 = header_avatar_src(page)
        print("organiser header after signup:", osrc1, flush=True)
        page.screenshot(path=".e2e/repro2_03_org_after_signup.png")

        print("== B: logout + login ==", flush=True)
        sign_out(page)
        login(page, ORG_EMAIL, "organiser")
        page.wait_for_selector("text=Post Production Call", timeout=60000)
        page.wait_for_timeout(2500)
        osrc2 = header_avatar_src(page)
        print("organiser header after relogin:", osrc2, flush=True)
        page.screenshot(path=".e2e/repro2_04_org_relogin.png")
        if not osrc2 or osrc2.startswith("data:") or (osrc1 and "blob:" in osrc2):
            failures.append(f"organiser signup avatar not persisted: before={osrc1} after={osrc2}")

        # organiser profile page
        page.get_by_role("button", name="Profile").first.click()
        page.wait_for_timeout(1200)
        page.screenshot(path=".e2e/repro2_05_org_profile.png")

        # ---- C: artist page refresh (no logout) ----
        print("== C: artist refresh persistence ==", flush=True)
        sign_out(page)
        login(page, ART_EMAIL, "artist")
        page.wait_for_selector("text=Discover", timeout=60000)
        page.wait_for_timeout(2000)
        before = header_avatar_src(page)
        page.reload(); page.wait_for_load_state("networkidle"); wait_loaded(page)
        page.wait_for_timeout(2500)
        after = header_avatar_src(page)
        print(f"artist header before refresh={before} after={after}", flush=True)
        if before != after:
            failures.append(f"artist avatar changed across refresh: {before} -> {after}")

        browser.close()
    print("\n==== RESULT ====", flush=True)
    if failures:
        for f in failures: print("FAIL:", f, flush=True)
        sys.exit(1)
    print("ALL PERSISTENCE CHECKS PASSED", flush=True)

if __name__ == "__main__":
    main()
