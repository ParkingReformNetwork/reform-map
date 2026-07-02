#!/usr/bin/env python3
"""Compare the summary stats of two benchmark-results/*.json files.

Usage:
    python3 scripts/compare-benchmarks.py <before.json> <after.json>
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any


def load(path: Path) -> dict[str, Any]:
    with path.open() as f:
        return json.load(f)


def fmt_value(key: str, value: float) -> str:
    if key == "totalBytes":
        return f"{value / 1_000_000:.2f} MB"
    return f"{value:.0f} ms"


def fmt_delta(key: str, delta: float) -> str:
    sign = "+" if delta >= 0 else ""
    if key == "totalBytes":
        return f"{sign}{delta / 1_000_000:.2f} MB"
    return f"{sign}{delta:.0f} ms"


def fmt_percent(pct: float | None) -> str:
    if pct is None:
        return "n/a"
    sign = "+" if pct >= 0 else ""
    return f"{sign}{pct:.1f}%"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compare summary stats between two benchmark-results JSON files."
    )
    parser.add_argument("before", type=Path, help="Baseline benchmark JSON file")
    parser.add_argument("after", type=Path, help="Candidate benchmark JSON file")
    args = parser.parse_args()

    before = load(args.before)
    after = load(args.after)

    before_places = before.get("numPlaces")
    after_places = after.get("numPlaces")

    print(
        f"Before: {args.before} (commit {before.get('gitCommit', '?')}, "
        f"{before.get('timestamp', '?')}, {before_places} places)"
    )
    print(
        f"After:  {args.after} (commit {after.get('gitCommit', '?')}, "
        f"{after.get('timestamp', '?')}, {after_places} places)"
    )
    print()

    if before_places != after_places:
        print(
            f"WARNING: place counts differ ({before_places} vs {after_places}) "
            "-- results are not apples-to-apples",
            file=sys.stderr,
        )

    before_summary = before.get("summary", {})
    after_summary = after.get("summary", {})
    keys = [k for k in before_summary if k in after_summary]
    keys += [k for k in after_summary if k not in before_summary]

    header = f"{'Metric':<24}{'Before':>14}{'After':>14}{'Delta':>14}{'Delta %':>10}"
    print(header)
    print("-" * len(header))

    for key in keys:
        before_median = before_summary.get(key, {}).get("median")
        after_median = after_summary.get(key, {}).get("median")
        if before_median is None or after_median is None:
            continue
        delta = after_median - before_median
        pct = (delta / before_median * 100) if before_median else None
        print(
            f"{key:<24}"
            f"{fmt_value(key, before_median):>14}"
            f"{fmt_value(key, after_median):>14}"
            f"{fmt_delta(key, delta):>14}"
            f"{fmt_percent(pct):>10}"
        )


if __name__ == "__main__":
    main()
