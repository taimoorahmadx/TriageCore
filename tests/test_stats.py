from __future__ import annotations

import pytest

from src.eval.stats import wilson_interval


def test_wilson_interval_for_zero_successes() -> None:
    lower, upper = wilson_interval(0, 4)

    assert lower == 0.0
    assert upper == pytest.approx(0.490, abs=0.001)


def test_wilson_interval_for_half_successes() -> None:
    lower, upper = wilson_interval(5, 10)

    assert lower == pytest.approx(0.237, abs=0.001)
    assert upper == pytest.approx(0.763, abs=0.001)


def test_wilson_interval_for_empty_sample() -> None:
    assert wilson_interval(0, 0) == (0.0, 1.0)
