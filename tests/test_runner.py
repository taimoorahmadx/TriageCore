"""Integration tests for the browser evidence collector against the real dummy pages.

The relocator is replaced by FixedRelocator (a stand-in for Groq) so these tests check
what the COLLECTOR observes, deterministically and without network access.
"""

import pytest
from playwright.sync_api import sync_playwright

from src.agents.qa_pipeline import DUMMY_DIR
from src.browser.runner import StepSpec, Timing, collect_step_evidence, serve_directory
from tests.fakes import FixedRelocator

FAST = Timing(first_try_ms=300, rewait_pauses_ms=(300, 600, 1200), observation_window_ms=800, settle_ms=200)
RENAMED = "#btn-add-item-primary"

LAB_STEP = StepSpec(
    id="add_to_cart",
    name="Add laptop stand to cart",
    intent="Add to cart button for the laptop stand",
    original_selector="#add-to-cart",
    risk_tier="low",
    expected_state_selector="#cart-confirmation",
    error_state_selector="#cart-error",
    container_selector="#product-card",
)


@pytest.fixture(scope="module")
def browser_and_url():
    with serve_directory(DUMMY_DIR) as url, sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        yield browser, url
        browser.close()


def collect(browser_and_url, page_path, relocated=RENAMED, step=LAB_STEP):
    browser, url = browser_and_url
    context = browser.new_context()
    page = context.new_page()
    page.goto(f"{url}/{page_path}")
    try:
        return collect_step_evidence(page, step, FixedRelocator(relocated), FAST)
    finally:
        context.close()


def test_rename_ok_is_clean(browser_and_url):
    ev = collect(browser_and_url, "scenario_lab.html?case=rename_ok")
    s = ev.raw_signals
    assert ev.status == "triage"
    assert s["selector_healed"] is True and s["relocated_match_count"] == 1
    assert s["original_resolved_after_wait"] is False
    assert s["action_succeeded"] is True and s["expected_state_reached"] is True
    assert (s["uncaught_page_errors"], s["console_errors"], s["failed_requests"]) == (0, 0, 0)
    assert s["error_state_shown"] is False


def test_crash_is_observed(browser_and_url):
    ev = collect(browser_and_url, "scenario_lab.html?case=rename_crash")
    assert ev.raw_signals["uncaught_page_errors"] >= 1
    assert ev.raw_signals["expected_state_reached"] is False
    assert any("inventoryClient" in e for e in ev.observations["page_errors"])


def test_error_banner_is_observed(browser_and_url):
    ev = collect(browser_and_url, "scenario_lab.html?case=error_banner")
    assert ev.raw_signals["error_state_shown"] is True
    assert ev.raw_signals["uncaught_page_errors"] == 0
    assert ev.raw_signals["expected_state_reached"] is False


def test_silent_noop_shows_nothing_but_missing_result(browser_and_url):
    s = collect(browser_and_url, "scenario_lab.html?case=silent_noop").raw_signals
    assert s["action_succeeded"] is True
    assert (s["uncaught_page_errors"], s["console_errors"], s["failed_requests"]) == (0, 0, 0)
    assert s["expected_state_reached"] is False


def test_slow_render_resolves_without_relocation(browser_and_url):
    ev = collect(browser_and_url, "scenario_lab.html?case=slow_render", relocated=None)  # relocator must not be used
    s = ev.raw_signals
    assert s["original_resolved_after_wait"] is True
    assert s["selector_healed"] is False and s["relocated_match_count"] is None
    assert s["expected_state_reached"] is True
    assert ev.relocation_error is None


def test_console_noise_is_counted(browser_and_url):
    ev = collect(browser_and_url, "scenario_lab.html?case=console_noise")
    assert ev.raw_signals["console_errors"] >= 1
    assert ev.raw_signals["expected_state_reached"] is True


def test_tracking_404_is_counted(browser_and_url):
    ev = collect(browser_and_url, "scenario_lab.html?case=tracking_404")
    assert ev.raw_signals["failed_requests"] >= 1
    assert any("404" in r for r in ev.observations["failed_requests"])
    assert ev.raw_signals["expected_state_reached"] is True
    # The browser's own "Failed to load resource" console line must not count twice.
    assert ev.raw_signals["console_errors"] == 0


def test_ambiguous_selector_is_not_clicked(browser_and_url):
    s = collect(browser_and_url, "scenario_lab.html?case=ambiguous", relocated=".add-btn").raw_signals
    assert s["relocated_match_count"] == 2
    assert s["action_succeeded"] is None  # never clicked: ambiguity is not resolved silently


def test_relocation_failure_is_recorded(browser_and_url):
    ev = collect(browser_and_url, "scenario_lab.html?case=rename_ok", relocated=None)
    assert ev.raw_signals["relocated_match_count"] == 0
    assert ev.relocation_error


def test_invalid_selector_counts_as_no_match(browser_and_url):
    ev = collect(browser_and_url, "scenario_lab.html?case=rename_ok", relocated="button[[")
    assert ev.raw_signals["relocated_match_count"] == 0
    assert "invalid selector" in ev.relocation_error


def test_working_selector_needs_no_triage(browser_and_url):
    step = StepSpec(**{**LAB_STEP.__dict__, "original_selector": RENAMED})
    ev = collect(browser_and_url, "scenario_lab.html?case=rename_ok", step=step)
    assert ev.status == "passed"


def test_shopflow_payment_trap(browser_and_url):
    step = StepSpec(
        id="pay", name="Pay", intent="Pay button", original_selector="#submit-order", risk_tier="high",
        expected_state_selector="#order-confirmation", error_state_selector="#payment-error-banner",
        container_selector="#step-3-card",
    )
    s = collect(browser_and_url, "shopflow_app.html", relocated="#btn-checkout-pay", step=step).raw_signals
    assert s["uncaught_page_errors"] >= 1
    assert s["error_state_shown"] is True
    assert s["expected_state_reached"] is False
