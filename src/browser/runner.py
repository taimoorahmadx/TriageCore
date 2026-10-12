"""Browser evidence collector for the QA agent (Milestone 2).

For one test step whose selector may be broken, it:

1. tries the original selector;
2. if that fails, re-tries the ORIGINAL selector with growing pauses (a slow page, not a rename?);
3. if it still fails, asks the relocator (Groq) for a new selector and counts how many
   elements it matches;
4. clicks (only if exactly one target exists), then watches what happens for a short
   window: uncaught page errors, console errors, failed requests, and whether the
   step's expected-result / error markers appear;
5. returns the observations as ``raw_signals`` + ``context`` per docs/contracts/raw_signals.md.

It makes no decisions. Deciding is the ConfidenceEngine's job.
"""

from __future__ import annotations

import functools
import threading
import time
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass, field
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import Page
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError

from src.browser.relocator import RelocationError, RelocationRequest, Relocator


@dataclass(frozen=True)
class StepSpec:
    """One step of a browser test, as the test author wrote it."""

    id: str
    name: str
    intent: str  # what the element is for, given to the relocator
    original_selector: str
    risk_tier: str  # low / medium / high, see weights.yaml
    expected_state_selector: str | None = None  # visible when the step worked
    error_state_selector: str | None = None  # visible when the app reports a failure
    container_selector: str | None = None  # HTML region sent to the relocator


@dataclass(frozen=True)
class Timing:
    first_try_ms: int = 1000
    rewait_pauses_ms: tuple[int, ...] = (500, 1000, 2000)  # backoff before relocating
    click_timeout_ms: int = 2000
    observation_window_ms: int = 1500  # how long to wait for the expected result
    settle_ms: int = 400  # extra time to catch late errors


DEFAULT_TIMING = Timing()


@dataclass
class StepEvidence:
    step_id: str
    name: str
    status: str  # "passed" (original selector worked) or "triage" (engine must decide)
    raw_signals: dict[str, Any] = field(default_factory=dict)
    context: dict[str, Any] = field(default_factory=dict)
    observations: dict[str, list[str]] = field(default_factory=dict)  # the actual messages, for the UI
    relocation_error: str | None = None
    timings_ms: dict[str, int] = field(default_factory=dict)


BROWSER_RESOURCE_ERROR = "Failed to load resource"


def _is_app_console_error(msg_type: str, text: str) -> bool:
    """console.error messages written by the page's own code.

    Chromium also logs "Failed to load resource: ... 404" for every failed request.
    Those are already counted in ``failed_requests``; counting them again here would
    double-count one event across two evidence groups.
    """
    return msg_type == "error" and not text.startswith(BROWSER_RESOURCE_ERROR)


def _visible_unique(page: Page, selector: str) -> bool:
    try:
        loc = page.locator(selector)
        return loc.count() == 1 and loc.first.is_visible()
    except PlaywrightError:
        return False


def _count(page: Page, selector: str) -> tuple[int, str | None]:
    try:
        return page.locator(selector).count(), None
    except PlaywrightError as exc:  # syntactically invalid selector from the LLM
        return 0, f"invalid selector: {exc.message.splitlines()[0]}"


def collect_step_evidence(page: Page, step: StepSpec, relocator: Relocator, timing: Timing = DEFAULT_TIMING) -> StepEvidence:
    started = time.perf_counter()
    ms = lambda t0: int((time.perf_counter() - t0) * 1000)  # noqa: E731
    ev = StepEvidence(step_id=step.id, name=step.name, status="triage")

    # 1. The original selector, as the test was written.
    t0 = time.perf_counter()
    try:
        page.locator(step.original_selector).click(timeout=timing.first_try_ms)
        ev.status = "passed"
        ev.timings_ms = {"first_try": ms(t0), "total": ms(started)}
        return ev
    except (PlaywrightTimeoutError, PlaywrightError):
        pass
    ev.timings_ms["first_try"] = ms(t0)

    # 2. Re-wait for the ORIGINAL selector with growing pauses: maybe the page is just slow.
    t0 = time.perf_counter()
    resolved_after_wait = False
    for pause in timing.rewait_pauses_ms:
        page.wait_for_timeout(pause)
        if _visible_unique(page, step.original_selector):
            resolved_after_wait = True
            break
    ev.timings_ms["rewait"] = ms(t0)

    # 3. Relocate only if the original never appeared.
    target: str | None = None
    proposed: str | None = None
    match_count: int | None = None
    if resolved_after_wait:
        target = step.original_selector
    else:
        t0 = time.perf_counter()
        html = page.inner_html(step.container_selector) if step.container_selector else page.inner_html("body")
        try:
            proposed = relocator.relocate(RelocationRequest(step.original_selector, step.intent, html))
            match_count, invalid = _count(page, proposed)
            if invalid:
                ev.relocation_error = invalid
        except RelocationError as exc:
            ev.relocation_error = str(exc)
            match_count = 0
        ev.timings_ms["relocation"] = ms(t0)
        if match_count == 1:
            target = proposed

    signals: dict[str, Any] = {
        "selector_healed": not resolved_after_wait,
        "relocated_match_count": match_count,
        "original_resolved_after_wait": resolved_after_wait,
        "action_succeeded": None,
        "uncaught_page_errors": None,
        "console_errors": None,
        "failed_requests": None,
        "expected_state_reached": None,
        "error_state_shown": None,
    }

    # 4. Click and observe, but only if there is exactly one element to act on.
    obs: dict[str, list[str]] = {"page_errors": [], "console_errors": [], "failed_requests": []}
    if target is not None:
        on_page_error = lambda err: obs["page_errors"].append(str(err))  # noqa: E731
        on_console = lambda msg: _is_app_console_error(msg.type, msg.text) and obs["console_errors"].append(msg.text)  # noqa: E731
        on_failed = lambda req: obs["failed_requests"].append(f"{req.url} ({req.failure})")  # noqa: E731
        on_response = lambda res: res.status >= 400 and obs["failed_requests"].append(f"{res.url} (HTTP {res.status})")  # noqa: E731
        page.on("pageerror", on_page_error)
        page.on("console", on_console)
        page.on("requestfailed", on_failed)
        page.on("response", on_response)
        t0 = time.perf_counter()
        try:
            page.locator(target).click(timeout=timing.click_timeout_ms)
            signals["action_succeeded"] = True
        except (PlaywrightTimeoutError, PlaywrightError):
            signals["action_succeeded"] = False

        if step.expected_state_selector:
            try:
                page.locator(step.expected_state_selector).wait_for(state="visible", timeout=timing.observation_window_ms)
                signals["expected_state_reached"] = True
            except PlaywrightTimeoutError:
                signals["expected_state_reached"] = False
        page.wait_for_timeout(timing.settle_ms)
        if step.error_state_selector:
            signals["error_state_shown"] = page.locator(step.error_state_selector).first.is_visible()
        ev.timings_ms["observation"] = ms(t0)

        for event, handler in (("pageerror", on_page_error), ("console", on_console),
                               ("requestfailed", on_failed), ("response", on_response)):
            page.remove_listener(event, handler)
        signals["uncaught_page_errors"] = len(obs["page_errors"])
        signals["console_errors"] = len(obs["console_errors"])
        signals["failed_requests"] = len(obs["failed_requests"])

    ev.raw_signals = signals
    ev.observations = obs
    ev.context = {
        "step_id": step.id,
        "page_url": page.url,
        "original_selector": step.original_selector,
        "proposed_selector": proposed,
        "expected_state_selector": step.expected_state_selector,
        "error_state_selector": step.error_state_selector,
        "observation_window_ms": timing.observation_window_ms,
        "relocation_latency_ms": ev.timings_ms.get("relocation"),
        "risk_tier": step.risk_tier,
    }
    ev.timings_ms["total"] = ms(started)
    return ev


class _QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
        pass


@contextmanager
def serve_directory(root: Path) -> Iterator[str]:
    """Serve a folder over local HTTP (so network requests and 404s behave like a real site)."""
    handler = functools.partial(_QuietHandler, directory=str(root))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}"
    finally:
        server.shutdown()
        server.server_close()
