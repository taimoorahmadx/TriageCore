"""Statistical helpers for evaluation reports."""

from __future__ import annotations

import math


def wilson_interval(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    """Return the Wilson score interval for ``k / n``.

    The bounds are ``(p + z²/(2n) ± z*sqrt((p(1-p) + z²/(4n))/n)) /
    (1 + z²/n)``, where ``p = k / n``. An empty sample spans the full range.
    """
    if n == 0:
        return (0.0, 1.0)

    p = k / n
    z_squared = z**2
    denominator = 1 + z_squared / n
    centre = p + z_squared / (2 * n)
    margin = z * math.sqrt((p * (1 - p) + z_squared / (4 * n)) / n)
    return ((centre - margin) / denominator, (centre + margin) / denominator)
