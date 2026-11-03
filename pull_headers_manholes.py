#!/usr/bin/env python3
"""
Pull FloodPro layer 5 (Header) and layer 6 (Manhole) point features.

Outputs:
  Austin_FloodPro_Headers.geojson
  Austin_FloodPro_Manholes.geojson
  metadata_headers_manholes.json
"""

from __future__ import annotations

import gzip
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

SERVICE_URL = (
    "https://maps.austintexas.gov/arcgis/rest/services/"
    "FloodPro/Stormdrain_Infrastructure/MapServer"
)
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
PAGE_SIZE = 2000
LOCAL_TZ = ZoneInfo("America/Chicago")
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
)


def arcgis_request(query_url: str, params: dict, retries: int = 6, timeout: int = 180) -> dict:
    body = urllib.parse.urlencode(params, doseq=True).encode("utf-8")
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(
                query_url,
                data=body,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept": "application/json, application/geo+json",
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                },
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read()
            obj = json.loads(raw.decode("utf-8"))
            if isinstance(obj, dict) and "error" in obj:
                raise RuntimeError(f"ArcGIS error: {obj['error']}")
            return obj
        except Exception as exc:
            last_error = exc
            wait = min(2**attempt, 30)
            print(f"    request failed ({exc}); retry {attempt}/{retries} in {wait}s", flush=True)
            time.sleep(wait)
    raise RuntimeError(f"ArcGIS query failed after {retries} attempts: {last_error}")


def get_count(query_url: str) -> int:
    data = arcgis_request(
        query_url,
        {"where": "1=1", "returnCountOnly": "true", "f": "json"},
    )
    return int(data["count"])


def download_features(query_url: str, count: int) -> list[dict]:
    features: list[dict] = []
    offset = 0
    while offset < count:
        page = arcgis_request(
            query_url,
            {
                "where": "1=1",
                "outFields": "*",
                "returnGeometry": "true",
                "outSR": "4326",
                "orderByFields": "OBJECTID ASC",
                "resultOffset": str(offset),
                "resultRecordCount": str(PAGE_SIZE),
                "f": "geojson",
            },
        )
        batch = page.get("features") or []
        if not batch:
            break
        features.extend(batch)
        offset += len(batch)
        print(
            f"    downloaded {offset:,} / {count:,} "
            f"({offset / count * 100:5.1f}%)",
            flush=True,
        )
        if len(batch) < PAGE_SIZE:
            break

    if len(features) != count:
        raise RuntimeError(f"Expected {count:,} features, got {len(features):,}")
    ids = {f.get("id") for f in features}
    if len(ids) != count:
        raise RuntimeError(
            f"Expected {count:,} unique OBJECTIDs, got {len(ids):,}"
        )
    return features


def pull_layer(layer_id: int, name: str, out_geojson: str) -> dict:
    layer_url = f"{SERVICE_URL}/{layer_id}"
    query_url = f"{layer_url}/query"

    print(f"Layer {layer_id}: {name}")
    count = get_count(query_url)
    print(f"  Feature count: {count:,}")
    features = download_features(query_url, count)

    fc = {
        "type": "FeatureCollection",
        "name": name,
        "source": layer_url,
        "query_url": query_url,
        "pulled_at_utc": datetime.now(timezone.utc).isoformat(),
        "count": count,
        "features": features,
    }
    with open(out_geojson, "w", encoding="utf-8") as f:
        json.dump(fc, f)
    print(f"  Wrote {out_geojson} ({count:,} features)")
    return {"layer_id": layer_id, "name": name, "count": count, "url": layer_url}


def main():
    results = []
    results.append(pull_layer(5, "Header", os.path.join(OUT_DIR, "Austin_FloodPro_Headers.geojson")))
    results.append(pull_layer(6, "Manhole", os.path.join(OUT_DIR, "Austin_FloodPro_Manholes.geojson")))

    meta = {
        "source_page": "https://maps.austintexas.gov/floodpro/",
        "service_url": SERVICE_URL,
        "pulled_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "layers": results,
    }
    meta_path = os.path.join(OUT_DIR, "metadata_headers_manholes.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print(f"Wrote {meta_path}")


if __name__ == "__main__":
    main()
