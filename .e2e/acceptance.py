"""KALA E2E acceptance test: fresh DB, real Supabase, both portals.

Flow:
  A. gateway loads, no DB error banner
  B. organiser signup -> post a call -> 0 submissions shown
  C. artist signup -> apply -> Under Review -> survives reload
  D. organiser relogin -> 1 submission (trigger) -> Commission -> Selected -> rate 4
  E. artist relogin -> application shows Selected
"""
import os
import sys
import time
import traceback

from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:3000"
SHOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(SHOT_DIR, exist_ok=True)

TS = str(int(time.time()))
ORG_EMAIL = f"e2e-org-{TS}@example.com"
ART_EMAIL = f"e2e-artist-{TS}@example.com"
PW = "E2eTest123!"
CALL_TITLE = f"E2E Open Call Sitarists {TS}"
ARTIST_NAME = "E2E Test Artist"

failures = []
step = 0


def shot(page, name):
    global step
    step += 1
    path = os.path.join(SHOT_DIR, f"{step:02d}_{name}.png")
    page.screenshot(path=path, full_page=False)
    print(f"  [shot] {path}", flush=True)


def check(cond, label):
    if cond:
        print(f"  PASS: {label}", flush=True)
    else:
        print(f"  FAIL: {label}", flush=True)
        failures.append(label)
    return cond


def session_keys(page):
    return page.evaluate(
        "Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))"
    )


def wait_app_loaded(page, timeout=45000):
    """Gateway or main app settled: workspace spinner gone, no DB-missing banner."""
    page.wait_for_selector("text=Loading your workspace", state="detached", timeout=timeout)
    return True


def open_signup(page, which):
    page.wait_for_selector("text=Select Your Workspace to Log In", timeout=20000)
    page.get_by_role("button", name=which).click()
    page.wait_for_selector("#signup-submit-btn", timeout=10000)


def fill_signup(page, name, email, org=None):
    if org is not None:
        page.fill("#signup-org-name", org)
    page.fill("#signup-name", name)
    page.fill("#signup-email", email)
    page.fill("#signup-password", PW)
    page.fill("#signup-confirm-password", PW)


def wait_for_portal(page, marker, timeout=60000):
    page.wait_for_selector(f"text={marker}", timeout=timeout)
    # loading screen animation gone
    page.wait_for_timeout(500)


def sign_out(page):
    page.click("#user-profile-menu-btn")
    page.get_by_role("button", name="Log Out of Supabase Session").click()
    page.wait_for_selector("text=Select Your Workspace to Log In", timeout=20000)


def sign_in(page, portal):
    page.wait_for_selector("text=Select Your Workspace to Log In", timeout=20000)
    page.get_by_role("button", name="Log In with Email").nth(0 if portal == "artist" else 1).click()
    page.wait_for_selector('input[type="email"]', timeout=10000)
    page.locator('input[type="email"]').first.fill(ORG_EMAIL if portal == "organiser" else ART_EMAIL)
    page.locator('input[type="password"]').first.fill(PW)
    page.get_by_role("button", name=f"Sign In to {'Organiser' if portal == 'organiser' else 'Artist'} Portal").click()


def phase_a(page):
    print("PHASE A: fresh load / schema", flush=True)
    page.goto(BASE)
    page.wait_for_load_state("networkidle")
    check(page.locator("text=Select Your Workspace to Log In").count() > 0, "gateway renders")
    wait_app_loaded(page)
    body = page.inner_text("body")
    check("Database tables missing" not in body, "no missing-schema banner")
    check("permission denied" not in body.lower(), "no RLS permission banner")
    shot(page, "gateway")


def phase_b(page):
    print("PHASE B: organiser signup + publish call", flush=True)
    open_signup(page, "+ Register Cultural Venue")
    fill_signup(page, "E2E Test Curator", ORG_EMAIL, org="E2E Test Theatre")
    shot(page, "signup_organiser")
    page.click("#signup-submit-btn")
    wait_for_portal(page, "Post Production Call")
    keys = session_keys(page)
    check(len(keys) > 0, f"organiser session persisted ({len(keys)} key)")
    if not keys:
        raise RuntimeError("No Supabase session after signup: email confirmation likely enabled in Auth settings")

    # publish a call
    page.get_by_role("button", name="Post Production Call").click()
    page.wait_for_selector('input[placeholder*="Monsoon Classical"]', timeout=10000)
    page.fill('input[placeholder*="Monsoon Classical"]', CALL_TITLE)
    shot(page, "post_modal")
    page.get_by_role("button", name="Publish Call").click()
    page.wait_for_selector("text=Publish Call", state="detached", timeout=30000)
    page.wait_for_selector(f"text={CALL_TITLE}", timeout=20000)
    check(True, "published call appears in Manage Calls")
    body = page.inner_text("body")
    check("Closes in NaN" not in body, "deadline badge is not NaN")
    # overview counts
    page.get_by_role("button", name="Overview").first.click()
    page.wait_for_timeout(1500)
    body = page.inner_text("body")
    check("0 Submissions" in body, "listing shows 0 submissions before anyone applies")
    shot(page, "organiser_overview_empty")
    sign_out(page)


def phase_c(page):
    print("PHASE C: artist signup + apply + reload", flush=True)
    open_signup(page, "+ Sign up as new Artist")
    fill_signup(page, ARTIST_NAME, ART_EMAIL)
    page.fill("#signup-discipline", "Sitarist")
    shot(page, "signup_artist")
    page.click("#signup-submit-btn")
    wait_for_portal(page, "Discover")

    # find the call and apply (home or discover)
    page.get_by_role("button", name="Discover").first.click()
    page.wait_for_timeout(1500)
    card_apply = page.locator("div", has_text=CALL_TITLE).get_by_role("button", name="Apply Now")
    if card_apply.count() == 0:
        page.get_by_role("button", name="Home").first.click()
        page.wait_for_timeout(1500)
    card_apply = page.locator("text=" + CALL_TITLE).first.locator(
        "xpath=ancestor::div[contains(@class,'group') or contains(@class,'rounded')][1]"
    ).get_by_role("button", name="Apply Now")
    expect(card_apply.first).to_be_visible(timeout=15000)
    card_apply.first.click()

    page.wait_for_selector("text=Submit Application", timeout=10000)
    page.locator('input[placeholder="e.g. 4"]').fill("6")
    page.locator('input[placeholder="e.g. Mumbai"]').fill("Mumbai")
    page.locator('input[placeholder*="Carnatic Vocals"]').fill("Sitar, Raga, Improvisation")
    page.locator('textarea[placeholder*="Briefly introduce"]').fill("E2E test application pitch.")
    shot(page, "apply_modal")
    page.get_by_role("button", name="Submit Application").click()
    page.wait_for_selector("text=Submit Application", state="detached", timeout=30000)
    check(True, "application submitted, modal closed")

    page.get_by_role("button", name="Applications").first.click()
    page.wait_for_timeout(1500)
    body = page.inner_text("body")
    check(CALL_TITLE in body, "application card visible in Applications tab")
    check("Under Review" in body, "status is Under Review")
    shot(page, "artist_applications")

    page.reload()
    page.wait_for_load_state("networkidle")
    wait_app_loaded(page)
    page.get_by_role("button", name="Applications").first.click()
    page.wait_for_timeout(1500)
    body = page.inner_text("body")
    check(CALL_TITLE in body and "Under Review" in body, "application survives reload (DB persistence)")
    sign_out(page)


def phase_d(page):
    print("PHASE D: organiser review, count, approve, rate", flush=True)
    sign_in(page, "organiser")
    wait_for_portal(page, "Post Production Call")
    page.wait_for_timeout(2000)
    body = page.inner_text("body")
    check("1 Submissions" in body, "applicant_count trigger: listing shows 1 submission")
    shot(page, "organiser_overview_1")

    page.get_by_role("button", name="Talent Pipeline").first.click()
    page.wait_for_timeout(1500)
    body = page.inner_text("body")
    check(ARTIST_NAME in body, "applicant card in pipeline")
    check("Under Review" in body, "applicant starts Under Review")
    check("1 Total Submissions" in body, "pipeline header counts 1")

    page.get_by_role("button", name="Commission Artist").click()
    page.wait_for_selector("text=Artist Selected", timeout=30000)
    body = page.inner_text("body")
    check("Artist Selected" in body, "status moved to Artist Selected")

    page.locator('button[title="Rate 4 stars"]').first.click()
    page.wait_for_selector('div[title="Rated 4/5"]', timeout=30000)
    check(page.locator('div[title="Rated 4/5"]').count() > 0, "organiser rating saved as 4/5")
    shot(page, "pipeline_selected_rated")
    sign_out(page)


def phase_e(page):
    print("PHASE E: artist relogin sees Selected", flush=True)
    sign_in(page, "artist")
    wait_for_portal(page, "Discover")
    page.get_by_role("button", name="Applications").first.click()
    page.wait_for_timeout(1500)
    body = page.inner_text("body")
    check(CALL_TITLE in body, "application still present after relogin")
    check("Selected" in body and "Not Selected" not in body, "artist sees Selected status")
    shot(page, "artist_selected")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.set_default_timeout(20000)
        try:
            phase_a(page)
            phase_b(page)
            phase_c(page)
            phase_d(page)
            phase_e(page)
        except Exception:
            traceback.print_exc()
            failures.append(f"exception: {sys.exc_info()[1]}")
            try:
                shot(page, "failure")
                print("PAGE TEXT (first 800):", page.inner_text("body")[:800].replace("\n", " | "), flush=True)
            except Exception:
                pass
        finally:
            browser.close()

    print("\n==== E2E SUMMARY ====", flush=True)
    if failures:
        for f in failures:
            print(f"  FAIL: {f}", flush=True)
        sys.exit(1)
    print("  ALL PHASES PASSED", flush=True)


if __name__ == "__main__":
    main()
