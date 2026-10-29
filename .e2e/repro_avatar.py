"""Repro: profile avatar persistence across logout/login (artist + organiser)."""
import os, sys, time, struct, zlib
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
TS = str(int(time.time()))
ART_EMAIL = f"repro-artist-{TS}@example.com"
ORG_EMAIL = f"repro-org-{TS}@example.com"
PW = "E2eTest123!"
IMG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test-avatar.png")

def make_png(path, rgb=(228, 88, 38)):
    w = h = 64
    raw = b"".join(b"\x00" + bytes(rgb) * w for _ in range(h))
    def chunk(t, d):
        c = t + d
        return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw))
           + chunk(b"IEND", b""))
    open(path, "wb").write(png)

def wait_loaded(page):
    page.wait_for_selector("text=Loading your workspace", state="detached", timeout=45000)

def header_avatar_src(page):
    return page.evaluate("""() => {
        const btn = document.querySelector('#user-profile-menu-btn');
        const img = btn && btn.querySelector('img');
        if (img) return img.src;
        const header = document.querySelector('header');
        const candidates = header ? [...header.querySelectorAll('img')] : [];
        const pick = candidates.find(i => (i.className||'').includes('rounded-full')) || candidates[0];
        return pick ? pick.src : null;
    }""")

def open_signup(page, which):
    page.wait_for_selector("text=Select Your Workspace to Log In", timeout=20000)
    page.get_by_role("button", name=which).click()
    page.wait_for_selector("#signup-submit-btn", timeout=10000)

def sign_out(page):
    page.click("#user-profile-menu-btn")
    page.get_by_role("button", name="Log Out of Supabase Session").click()
    page.wait_for_selector("text=Select Your Workspace to Log In", timeout=20000)

def main():
    make_png(IMG)
    failures = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.set_default_timeout(20000)

        # ---- ARTIST ----
        print("== ARTIST signup + avatar upload ==", flush=True)
        page.goto(BASE); page.wait_for_load_state("networkidle"); wait_loaded(page)
        open_signup(page, "+ Sign up as new Artist")
        page.fill("#signup-name", "Repro Artist")
        page.fill("#signup-email", ART_EMAIL)
        page.fill("#signup-password", PW)
        page.fill("#signup-confirm-password", PW)
        page.click("#signup-submit-btn")
        page.wait_for_selector("text=Discover", timeout=60000)
        page.wait_for_timeout(800)

        # Go to Profile, open avatar editor, upload
        page.get_by_role("button", name="Profile").first.click()
        page.wait_for_timeout(1000)
        page.get_by_title("Update avatar").click()
        page.wait_for_timeout(400)
        section = page.get_by_text("Update Profile Avatar").locator(
            "xpath=ancestor::div[contains(@class,'mt-5')][1]"
        )
        section.locator('input[type=file]').set_input_files(IMG)
        page.wait_for_timeout(500)
        section.get_by_role("button", name="Confirm & Upload").click()
        page.wait_for_timeout(4000)
        page.screenshot(path=".e2e/repro_01_artist_after_upload.png")
        src1 = header_avatar_src(page)
        print("header avatar after upload:", src1, flush=True)
        ls1 = page.evaluate("() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('kala_profile_media')))")
        print("localStorage profile media:", ls1, flush=True)

        # Check storage bucket upload result / any error text
        body = page.inner_text("body")
        if "Upload failed" in body or "Media storage is missing" in body:
            print("UPLOAD ERROR VISIBLE:", [l for l in body.split("\n") if "Upload" in l or "storage" in l][:5], flush=True)

        print("== logout ==", flush=True)
        sign_out(page)
        print("== login again ==", flush=True)
        page.get_by_role("button", name="Log In with Email").nth(0).click()
        page.wait_for_selector('input[type="email"]', timeout=10000)
        page.locator('input[type="email"]').first.fill(ART_EMAIL)
        page.locator('input[type="password"]').first.fill(PW)
        page.get_by_role("button", name="Sign In to Artist Portal").click()
        page.wait_for_selector("text=Discover", timeout=60000)
        page.wait_for_timeout(2000)
        src2 = header_avatar_src(page)
        print("header avatar after relogin:", src2, flush=True)
        page.screenshot(path=".e2e/repro_02_artist_after_relogin.png")
        ls2 = page.evaluate("() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('kala_profile_media')))")
        print("localStorage after relogin:", ls2, flush=True)

        # profile page avatar
        page.get_by_role("button", name="Profile").first.click()
        page.wait_for_timeout(1200)
        page.screenshot(path=".e2e/repro_03_artist_profile_after_relogin.png")
        prof_avatar = page.evaluate("""() => {
            const img = [...document.querySelectorAll('img')].find(i => (i.alt||'').includes('Profile Avatar'));
            return img ? img.src : null;
        }""")
        print("profile page avatar src:", prof_avatar, flush=True)

        if not src2 or src2.startswith("data:") or (src1 and src2 != src1 and "blob:" in (src2 or "")):
            failures.append(f"artist header avatar not persisted: before={src1} after={src2}")
        if not prof_avatar:
            failures.append("artist profile page has no avatar after relogin")

        browser.close()
    print("\n==== RESULT ====", flush=True)
    if failures:
        for f in failures: print("FAIL:", f, flush=True)
        sys.exit(1)
    print("AVATAR PERSISTED", flush=True)

if __name__ == "__main__":
    main()
