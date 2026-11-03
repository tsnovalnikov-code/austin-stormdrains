#!/usr/bin/env python3
"""
Pull the City of Austin FloodPro "Drainage Pipe" (public) layer 7 and export it.

Source page : https://maps.austintexas.gov/floodpro/
ArcGIS layer: https://maps.austintexas.gov/arcgis/rest/services/FloodPro/Stormdrain_Infrastructure/MapServer/7
Layer name  : Drainage Pipe (public)

Outputs (in this folder):
  Austin_Public_Drainage_Pipes.geojson
  Austin_Public_Drainage_Pipes.csv
  metadata.json

Requires: Python 3.9+
"""

from __future__ import annotations

import csv
import gzip
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SERVICE_URL = (
    "https://maps.austintexas.gov/arcgis/rest/services/"
    "FloodPro/Stormdrain_Infrastructure/MapServer"
)
LAYER_ID = 7
LAYER_URL = f"{SERVICE_URL}/{LAYER_ID}"
QUERY_URL = f"{LAYER_URL}/query"
SOURCE_PAGE = "https://maps.austintexas.gov/floodpro/"
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
PAGE_SIZE = 2000
LOCAL_TZ = ZoneInfo("America/Chicago")
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
)

GEOJSON_PATH = os.path.join(OUT_DIR, "Austin_Public_Drainage_Pipes.geojson")
CSV_PATH = os.path.join(OUT_DIR, "Austin_Public_Drainage_Pipes.csv")
META_PATH = os.path.join(OUT_DIR, "metadata_public.json")
CACHE_PATH = os.path.join(OUT_DIR, "_raw_features_public.json.gz")


# ---------------------------------------------------------------------------
# ArcGIS helpers
# ---------------------------------------------------------------------------
def arcgis_request(params: dict, retries: int = 6, timeout: int = 180) -> dict:
    """POST a query to the ArcGIS REST endpoint and return decoded JSON."""
    body = urllib.parse.urlencode(params, doseq=True).encode("utf-8")
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(
                QUERY_URL,
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
        except Exception as exc:  # noqa: BLE001 - retry all transport/JSON errors
            last_error = exc
            wait = min(2**attempt, 30)
            print(f"    request failed ({exc}); retry {attempt}/{retries} in {wait}s", flush=True)
            time.sleep(wait)
    raise RuntimeError(f"ArcGIS query failed after {retries} attempts: {last_error}")


def get_layer_metadata() -> dict:
    url = f"{LAYER_URL}?f=json"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_count() -> int:
    data = arcgis_request(
        {"where": "1=1", "returnCountOnly": "true", "f": "json"}
    )
    return int(data["count"])


def download_features(count: int) -> list[dict]:
    """Page through the layer in OBJECTID order, 2,000 features at a time."""
    features: list[dict] = []
    offset = 0
    while offset < count:
        page = arcgis_request(
            {
                "where": "1=1",
                "outFields": "*",
                "returnGeometry": "true",
                "outSR": "4326",
                "orderByFields": "OBJECTID ASC",
                "resultOffset": str(offset),
                "resultRecordCount": str(PAGE_SIZE),
                "f": "geojson",
            }
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

    # Validate completeness / uniqueness before doing any expensive writing.
    if len(features) != count:
        raise RuntimeError(f"Expected {count:,} features, got {len(features):,}")
    ids = {f.get("id") for f in features}
    if len(ids) != count:
        raise RuntimeError(
            f"Expected {count:,} unique OBJECTIDs, got {len(ids):,}; pagination may have shifted"
        )
    return features


def save_cache(features: list[dict], count: int) -> None:
    payload = {
        "count": count,
        "pulled_at_utc": datetime.now(timezone.utc).isoformat(),
        "features": features,
    }
    with gzip.open(CACHE_PATH, "wt", encoding="utf-8") as f:
        json.dump(payload, f)


def load_cache() -> tuple[int, list[dict]]:
    with gzip.open(CACHE_PATH, "rt", encoding="utf-8") as f:
        payload = json.load(f)
    return payload["count"], payload["features"]


def feature_to_row(f: dict) -> dict:
    """Flatten a GeoJSON feature into a row dict for CSV export."""
    props = f.get("properties") or {}
    geom = f.get("geometry") or {}
    coords = geom.get("coordinates") or []
    row = dict(props)
    row["geometry"] = json.dumps(geom) if geom else ""
    row["start_lon"] = coords[0][0] if coords else ""
    row["start_lat"] = coords[0][1] if coords else ""
    row["end_lon"] = coords[-1][0] if coords else ""
    row["end_lat"] = coords[-1][1] if coords else ""
    return row


def write_csv(rows: list[dict], fields: list[str]) -> None:
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def write_geojson(features: list[dict], count: int, meta: dict) -> None:
    fc = {
        "type": "FeatureCollection",
        "name": "Austin_Public_Drainage_Pipes",
        "source": LAYER_URL,
        "query_url": QUERY_URL,
        "pulled_at_utc": datetime.now(timezone.utc).isoformat(),
        "count": count,
        "features": features,
    }
    with open(GEOJSON_PATH, "w", encoding="utf-8") as f:
        json.dump(fc, f)


def write_metadata(count: int, meta: dict, total_length_ft: float) -> None:
    meta_out = {
        "source_page": SOURCE_PAGE,
        "service_url": SERVICE_URL,
        "layer_id": LAYER_ID,
        "layer_name": meta.get("name", "Drainage Pipe"),
        "layer_url": LAYER_URL,
        "query_url": QUERY_URL,
        "feature_count": count,
        "pulled_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "pulled_at_local": datetime.now(LOCAL_TZ).strftime("%Y-%m-%d %I:%M:%S %p %Z"),
        "coordinate_system": "WGS84 / EPSG:4326",
        "total_shape_length_ft": total_length_ft,
        "total_shape_length_miles": total_length_ft / 5280,
        "outputs": {
            "geojson": "Austin_Public_Drainage_Pipes.geojson",
            "csv": "Austin_Public_Drainage_Pipes.csv",
        },
    }
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta_out, f, indent=2)


def main() -> None:
    use_cache = "--use-cache" in sys.argv

    if use_cache and os.path.exists(CACHE_PATH):
        print("Using cached raw download...")
        count, features = load_cache()
    else:
        meta = get_layer_metadata()
        print(f"Layer: {meta.get('name')} (id {LAYER_ID})")
        count = get_count()
        print(f"Feature count: {count:,}")
        features = download_features(count)
        save_cache(features, count)

    # Build rows and compute total length
    rows = [feature_to_row(f) for f in features]
    total_length = 0.0
    for f in features:
        props = f.get("properties") or {}
        slen = props.get("SHAPE.LEN")
        if slen is not None:
            try:
                total_length += float(slen)
            except (TypeError, ValueError):
                pass

    # Determine CSV field order
    field_order = [
        "OBJECTID", "DRAINAGE_ID", "JTX_JOBID", "COMMENTS",
        "UP_NODE_ID", "DN_NODE_ID", "UP_NODE_TYPE", "DN_NODE_TYPE",
        "CREATED_BY", "CREATED_DATE", "MODIFIED_BY", "MODIFIED_DATE",
        "CHECKED_BY", "WATERSHED", "MAP_INDEX", "MAPSCO",
        "DATE_BUILT", "YEAR_BUILT", "YEAR_SOURCE", "YEAR_ABANDONED",
        "LOCATION_SOURCE", "PLACE_ID", "OBSERVATION", "DIMEN_SOURCE",
        "UP_ELEV_SOURCE", "DN_ELEV_SOURCE", "UP_INVERT", "DN_INVERT",
        "SLOPE", "SLOPE_EST", "LENGTH", "OWNERSHIP", "MAINTENANCE",
        "STRUCT_SHAPE", "WIDTH", "HEIGHT", "MATERIAL", "SUBTYPE",
        "GLOBALID", "EDIT_STATUS", "FME_DATE", "STATUS", "SHAPE.LEN",
        "MODELED", "REHAB_METHOD", "REHAB_DATE", "MAXIMO_ASSET_NUMBER",
        "MAXIMO_SITE_ID",
        "geometry", "start_lon", "start_lat", "end_lon", "end_lat",
    ]
    # Add any fields not in the standard order
    all_fields = set()
    for row in rows:
        all_fields.update(row.keys())
    for extra in sorted(all_fields - set(field_order)):
        field_order.append(extra)

    write_csv(rows, field_order)
    write_geojson(features, count, {})
    write_metadata(count, {}, total_length)

    print(f"\nDone. {count:,} features written.")
    print(f"  GeoJSON: {GEOJSON_PATH}")
    print(f"  CSV: {CSV_PATH}")
    print(f"  Metadata: {META_PATH}")
    print(f"  Total length: {total_length:,.1f} ft ({total_length/5280:,.2f} miles)")


if __name__ == "__main__":
    main()
