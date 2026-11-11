#!/usr/bin/env python3
"""
Keyword idea finder using the DataForSEO Labs "keyword_ideas" endpoint.

For each seed keyword it pulls related keyword ideas with search volume,
CPC, competition level, keyword difficulty (KD) and search intent, then
saves them to a CSV sorted by volume.

Setup (once):
    pip install requests
    # Mac/Linux
    export DFS_LOGIN="your_api_login"
    export DFS_PASSWORD="your_api_password"
    # Windows PowerShell
    $env:DFS_LOGIN="your_api_login"
    $env:DFS_PASSWORD="your_api_password"

Use the API login/password from dashboard -> API Access
(NOT your account login password).

Run:
    python keyword_research.py seeds.txt
    python keyword_research.py seeds.txt --max-kd 30 --min-volume 500 --limit 300

seeds.txt: one seed keyword per line (lines starting with # are ignored).
"""
import argparse
import csv
import os
import sys

import requests

ENDPOINT = "https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_ideas/live"
MAX_SEEDS_PER_REQUEST = 200


def load_seeds(path):
    with open(path, encoding="utf-8") as f:
        seeds = [line.strip() for line in f]
    return [s for s in seeds if s and not s.startswith("#")]


def fetch_ideas(seeds, login, password, location_code, language_code, limit):
    payload = [{
        "keywords": seeds,
        "location_code": location_code,
        "language_code": language_code,
        "limit": limit,
    }]
    resp = requests.post(ENDPOINT, json=payload, auth=(login, password), timeout=120)
    resp.raise_for_status()
    data = resp.json()

    if data.get("status_code") != 20000:
        sys.exit(f"API error: {data.get('status_code')} {data.get('status_message')}")
    task = data["tasks"][0]
    if task.get("status_code") != 20000:
        sys.exit(f"Task error: {task.get('status_code')} {task.get('status_message')}")

    result = task.get("result") or []
    items = (result[0].get("items") or []) if result else []
    cost = data.get("cost")
    return items, cost


def to_row(item):
    info = item.get("keyword_info") or {}
    props = item.get("keyword_properties") or {}
    intent = item.get("search_intent_info") or {}
    return {
        "keyword": item.get("keyword"),
        "volume": info.get("search_volume") or 0,
        "cpc": info.get("cpc"),
        "competition": info.get("competition_level"),
        "difficulty": props.get("keyword_difficulty"),
        "intent": intent.get("main_intent"),
    }


def main():
    ap = argparse.ArgumentParser(description="DataForSEO keyword idea finder")
    ap.add_argument("seeds_file")
    ap.add_argument("--out", default="keyword_ideas.csv")
    ap.add_argument("--location-code", type=int, default=2840, help="2840 = United States")
    ap.add_argument("--language-code", default="en")
    ap.add_argument("--limit", type=int, default=200, help="ideas returned per request")
    ap.add_argument("--min-volume", type=int, default=0)
    ap.add_argument("--max-kd", type=int, default=100, help="keep keywords with KD <= this")
    args = ap.parse_args()

    login = os.environ.get("DFS_LOGIN")
    password = os.environ.get("DFS_PASSWORD")
    if not login or not password:
        sys.exit("Set DFS_LOGIN and DFS_PASSWORD environment variables first.")

    seeds = load_seeds(args.seeds_file)
    if not seeds:
        sys.exit("No seed keywords found in the file.")

    rows = {}
    total_cost = 0.0
    for i in range(0, len(seeds), MAX_SEEDS_PER_REQUEST):
        chunk = seeds[i:i + MAX_SEEDS_PER_REQUEST]
        items, cost = fetch_ideas(chunk, login, password,
                                  args.location_code, args.language_code, args.limit)
        total_cost += cost or 0
        for item in items:
            row = to_row(item)
            if row["keyword"]:
                rows[row["keyword"]] = row

    kept = []
    for row in rows.values():
        kd = row["difficulty"]
        if row["volume"] < args.min_volume:
            continue
        if kd is not None and kd > args.max_kd:  # unknown KD is kept
            continue
        kept.append(row)
    kept.sort(key=lambda r: r["volume"], reverse=True)

    fields = ["keyword", "volume", "cpc", "competition", "difficulty", "intent"]
    with open(args.out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(kept)

    print(f"Seeds: {len(seeds)} | ideas found: {len(rows)} | kept after filters: {len(kept)}")
    print(f"API cost this run: ${total_cost:.4f}")
    print(f"Saved to {args.out}\n")
    print(f"{'keyword':45} {'vol':>8} {'cpc':>6} {'kd':>4}")
    for r in kept[:20]:
        cpc = f"{r['cpc']:.2f}" if r["cpc"] is not None else "-"
        kd = r["difficulty"] if r["difficulty"] is not None else "-"
        print(f"{r['keyword'][:45]:45} {r['volume']:>8} {cpc:>6} {kd:>4}")


if __name__ == "__main__":
    main()
