#!/usr/bin/env python3
"""
IndexNow Submission Helper for softcoverbooks.co.za
Sends an HTTP POST request to https://api.indexnow.org/IndexNow
"""

import sys
import os
import json
import argparse
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET

HOST = "www.softcoverbooks.co.za"
KEY = "e6b44d6766614ba9b455ea2a1eda494d"
KEY_LOCATION = f"https://{HOST}/e6b44d6766614ba9b455ea2a1eda494d.txt"
INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow"

def normalize_url(url: str) -> str:
    url = url.strip()
    if not url:
        return ""
    if url.startswith("/"):
        return f"https://{HOST}{url}"
    if not url.startswith("http://") and not url.startswith("https://"):
        return f"https://{HOST}/{url}"
    return url

def load_urls_from_sitemap(sitemap_path: str) -> list[str]:
    urls = []
    if not os.path.exists(sitemap_path):
        print(f"[!] Sitemap file not found at: {sitemap_path}")
        return urls
    try:
        tree = ET.parse(sitemap_path)
        root = tree.getroot()
        # Handle default namespace in sitemap XML
        ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        loc_elements = root.findall(".//sm:loc", ns)
        if not loc_elements:
            loc_elements = root.findall(".//loc")
        for loc in loc_elements:
            if loc.text and loc.text.strip():
                urls.append(loc.text.strip())
    except Exception as e:
        print(f"[!] Error parsing sitemap: {e}")
    return urls

def submit_indexnow(urls: list[str], dry_run: bool = False) -> bool:
    # Filter and deduplicate
    clean_urls = []
    seen = set()
    for u in urls:
        norm = normalize_url(u)
        if norm and norm not in seen:
            seen.add(norm)
            clean_urls.append(norm)

    if not clean_urls:
        print("[!] No URLs provided to submit.")
        return False

    payload = {
        "host": HOST,
        "key": KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": clean_urls
    }

    print(f"[*] Preparing IndexNow submission:")
    print(f"    Host:         {HOST}")
    print(f"    Key:          {KEY}")
    print(f"    Key Location: {KEY_LOCATION}")
    print(f"    URLs count:   {len(clean_urls)}")
    if len(clean_urls) <= 10:
        for u in clean_urls:
            print(f"      - {u}")
    else:
        for u in clean_urls[:5]:
            print(f"      - {u}")
        print(f"      ... and {len(clean_urls) - 5} more")

    if dry_run:
        print("[*] Dry run mode enabled. Submission skipped.")
        return True

    json_data = json.dumps(payload, indent=2).encode("utf-8")
    req = urllib.request.Request(
        INDEXNOW_ENDPOINT,
        data=json_data,
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "IndexNow-Submit-Tool/1.0"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            status_code = resp.getcode()
            response_body = resp.read().decode("utf-8")
            if status_code == 200:
                print(f"[+] SUCCESS (200 OK): URLs submitted and key validated.")
            elif status_code == 202:
                print(f"[+] ACCEPTED (202): URLs received by IndexNow. Key validation will be performed asynchronously.")
            else:
                print(f"[+] Response ({status_code}): {response_body}")
            return True
    except urllib.error.HTTPError as e:
        status_code = e.code
        body = e.read().decode("utf-8", errors="replace")
        print(f"[!] HTTP Error {status_code}: {e.reason}")
        if status_code == 400:
            print("    Cause: Invalid format in payload.")
        elif status_code == 403:
            print("    Cause: Key not valid, key file missing from web server, or host mismatch.")
            print(f"    Ensure '{KEY_LOCATION}' is published live before submitting.")
        elif status_code == 422:
            print("    Cause: In case of URLs which don't belong to the host or key not matching.")
        elif status_code == 429:
            print("    Cause: Too Many Requests (rate-limited).")
        if body:
            print(f"    Response details: {body}")
        return False
    except urllib.error.URLError as e:
        print(f"[!] Network error: {e.reason}")
        return False
    except Exception as e:
        print(f"[!] Unexpected error: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(
        description="Submit updated URLs to IndexNow (Bing / Yandex / Seznam) for https://www.softcoverbooks.co.za"
    )
    parser.add_argument(
        "urls",
        nargs="*",
        help="One or more URLs or paths to submit (e.g. /artikels.html)"
    )
    parser.add_argument(
        "--file", "-f",
        help="Path to a text file containing URLs to submit (one per line)"
    )
    parser.add_argument(
        "--sitemap", "-s",
        nargs="?",
        const="sitemap.xml",
        help="Extract and submit all URLs from local sitemap.xml (default: sitemap.xml)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show payload and URLs without sending HTTP request"
    )

    args = parser.parse_args()

    collected_urls = []

    if args.urls:
        collected_urls.extend(args.urls)

    if args.file:
        if os.path.exists(args.file):
            with open(args.file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        collected_urls.append(line)
        else:
            print(f"[!] File not found: {args.file}")
            sys.exit(1)

    if args.sitemap:
        sitemap_path = args.sitemap
        # If relative path, check current dir
        if not os.path.exists(sitemap_path):
            alt_path = os.path.join(os.path.dirname(__file__), "..", sitemap_path)
            if os.path.exists(alt_path):
                sitemap_path = alt_path
        collected_urls.extend(load_urls_from_sitemap(sitemap_path))

    # If no arguments provided, default to submitting the homepage and key sections
    if not collected_urls:
        print("[*] No URLs specified. Defaulting to homepage.")
        print("    Usage examples:")
        print("      python indexnow_submit.py https://www.softcoverbooks.co.za/artikels.html")
        print("      python indexnow_submit.py /artikels.html /soek%20boeke.html")
        print("      python indexnow_submit.py --sitemap")
        print("      python indexnow_submit.py --file urls.txt\n")
        collected_urls = [
            f"https://{HOST}/",
            f"https://{HOST}/artikels.html",
            f"https://{HOST}/soek%20boeke.html"
        ]

    success = submit_indexnow(collected_urls, dry_run=args.dry_run)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
