#!/usr/bin/env python3
"""Compare two benchmark-results/*.json files.

Each file has a nested `tasks` map (one high-level task -> {total, stages}) plus a
top-level `transfer` stat. We print, per task, the overall median delta followed by
its granular stages indented underneath.

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


def fmt_ms(value: float) -> str:
    return f"{value:.0f} ms"


def fmt_mb(value: float) -> str:
    return f"{value / 1_000_000:.2f} MB"


def fmt_delta_ms(delta: float) -> str:
    sign = "+" if delta >= 0 else ""
    return f"{sign}{delta:.0f} ms"


def fmt_delta_mb(delta: float) -> str:
    sign = "+" if delta >= 0 else ""
    return f"{sign}{delta / 1_000_000:.2f} MB"


def fmt_percent(pct: float | None) -> str:
    if pct is None:
        return "n/a"
    sign = "+" if pct >= 0 else ""
    return f"{sign}{pct:.1f}%"


def row(
    label: str,
    before_median: float | None,
    after_median: float | None,
    fmt_value: Any,
    fmt_delta: Any,
) -> None:
    if before_median is None or after_median is None:
        return
    delta = after_median - before_median
    pct = (delta / before_median * 100) if before_median else None
    print(
        f"{label:<24}"
        f"{fmt_value(before_median):>14}"
        f"{fmt_value(after_median):>14}"
        f"{fmt_delta(delta):>14}"
        f"{fmt_percent(pct):>10}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compare two benchmark-results JSON files (nested schema)."
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

    header = f"{'Metric':<24}{'Before':>14}{'After':>14}{'Delta':>14}{'Delta %':>10}"
    print(header)
    print("-" * len(header))

    before_tasks = before.get("tasks", {})
    after_tasks = after.get("tasks", {})
    # Preserve the insertion order the benchmark wrote (initial load first, etc.),
    # then append any task only present in the newer file.
    keys = list(before_tasks) + [k for k in after_tasks if k not in before_tasks]

    for key in keys:
        b = before_tasks.get(key, {})
        a = after_tasks.get(key, {})
        row(
            key,
            b.get("total", {}).get("median"),
            a.get("total", {}).get("median"),
            fmt_ms,
            fmt_delta_ms,
        )
        b_stages = b.get("stages", {})
        a_stages = a.get("stages", {})
        stage_keys = list(b_stages) + [k for k in a_stages if k not in b_stages]
        for stage in stage_keys:
            row(
                f"  {stage}",
                b_stages.get(stage, {}).get("median"),
                a_stages.get(stage, {}).get("median"),
                fmt_ms,
                fmt_delta_ms,
            )

    row(
        "transfer",
        before.get("transfer", {}).get("median"),
        after.get("transfer", {}).get("median"),
        fmt_mb,
        fmt_delta_mb,
    )


if __name__ == "__main__":
    main()
