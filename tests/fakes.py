"""Test-only implementations of browser pipeline collaborators."""

from src.browser.relocator import RelocationError, RelocationRequest


class FixedRelocator:
    """Return a predetermined selector for deterministic evidence-collector tests."""

    def __init__(self, selector: str | None) -> None:
        self.selector = selector

    def relocate(self, request: RelocationRequest) -> str:
        if self.selector is None:
            raise RelocationError("FixedRelocator configured to fail")
        return self.selector
