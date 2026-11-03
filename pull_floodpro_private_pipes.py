#!/usr/bin/env python3
"""
Pull the City of Austin FloodPro "Private Drainage Pipe" layer and export it.

Source page : https://maps.austintexas.gov/floodpro/
ArcGIS layer: https://maps.austintexas.gov/arcgis/rest/services/FloodPro/Stormdrain_Infrastructure/MapServer/8
Layer name  : Private Drainage Pipe

Outputs (in this folder):
  Austin_Private_Drainage_Pipes.xlsx
  Austin_Private_Drainage_Pipes.csv
  Austin_Private_Drainage_Pipes.geojson
  metadata.json

Requires: Python 3.9+ and xlsxwriter (pip install xlsxwriter)
"""

from __future__ import annotations

import argparse
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
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import xlsxwriter

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SERVICE_URL = (
    "https://maps.austintexas.gov/arcgis/rest/services/"
    "FloodPro/Stormdrain_Infrastructure/MapServer"
)
LAYER_ID = 8
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

XLSX_PATH = os.path.join(OUT_DIR, "Austin_Private_Drainage_Pipes.xlsx")
CSV_PATH = os.path.join(OUT_DIR, "Austin_Private_Drainage_Pipes.csv")
GEOJSON_PATH = os.path.join(OUT_DIR, "Austin_Private_Drainage_Pipes.geojson")
META_PATH = os.path.join(OUT_DIR, "metadata.json")
CACHE_PATH = os.path.join(OUT_DIR, "_raw_features.json.gz")


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
        "saved_at_utc": datetime.now(timezone.utc).isoformat(),
        "count": count,
        "features": features,
    }
    with gzip.open(CACHE_PATH, "wt", encoding="utf-8", compresslevel=6) as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"    cached raw features to {CACHE_PATH}", flush=True)


def load_cache(expected_count: int) -> list[dict] | None:
    if not os.path.exists(CACHE_PATH):
        return None
    try:
        with gzip.open(CACHE_PATH, "rt", encoding="utf-8") as fh:
            payload = json.load(fh)
        if int(payload.get("count", -1)) != expected_count:
            print(
                f"    cache has {payload.get('count')} features, service now has "
                f"{expected_count}; ignoring cache",
                flush=True,
            )
            return None
        features = payload.get("features") or []
        print(
            f"    loaded {len(features):,} cached features from {payload.get('saved_at_utc')}",
            flush=True,
        )
        return features
    except Exception as exc:  # noqa: BLE001 - a corrupt cache should not stop the run
        print(f"    could not read cache ({exc}); downloading fresh", flush=True)
        return None


# ---------------------------------------------------------------------------
# Field / value handling
# ---------------------------------------------------------------------------
def build_domains(meta: dict) -> tuple[dict[str, dict[str, str]], dict[str, str], dict[str, str]]:
    domains: dict[str, dict[str, str]] = {}
    aliases: dict[str, str] = {}
    field_types: dict[str, str] = {}
    for fld in meta.get("fields", []):
        name = fld["name"]
        aliases[name] = fld.get("alias", name)
        field_types[name] = fld.get("type", "")
        dom = fld.get("domain") or {}
        if dom.get("type") == "codedValue":
            domains[name] = {
                str(v.get("code")): str(v.get("name"))
                for v in dom.get("codedValues", [])
            }
    return domains, aliases, field_types


def to_local_datetime(epoch_ms: int | float | None) -> datetime | None:
    if epoch_ms is None:
        return None
    # Use epoch + timedelta instead of fromtimestamp(): Windows cannot handle
    # negative Unix timestamps (the layer has DATE_BUILT values from the 1910s).
    try:
        dt = datetime(1970, 1, 1, tzinfo=timezone.utc) + timedelta(
            milliseconds=float(epoch_ms)
        )
    except (TypeError, ValueError, OverflowError):
        return None
    return dt.astimezone(LOCAL_TZ).replace(tzinfo=None)


DATE_FIELDS = {"DATE_BUILT", "CREATED_DATE", "MODIFIED_DATE", "FME_DATE", "REHAB_DATE"}

# Numeric fields that should not be replaced by their coded-domain labels.
KEEP_NUMERIC = {"WIDTH", "HEIGHT", "LENGTH", "SHAPE.LEN", "SLOPE", "UP_INVERT", "DN_INVERT"}

# Fields whose coded values are shown as readable labels.
TRANSLATE_FIELDS = {
    "ENABLED",
    "UP_NODE_TYPE",
    "DN_NODE_TYPE",
    "CREATED_BY",
    "MODIFIED_BY",
    "CHECKED_BY",
    "WATERSHED",
    "YEAR_SOURCE",
    "LOCATION_SOURCE",
    "DIMEN_SOURCE",
    "UP_ELEV_SOURCE",
    "DN_ELEV_SOURCE",
    "SLOPE_EST",
    "OWNERSHIP",
    "MAINTENANCE",
    "STRUCT_SHAPE",
    "MATERIAL",
    "SUBTYPE",
    "EDIT_STATUS",
    "STATUS",
    "OBSERVATION",
    "MODELED",
    "REHAB_METHOD",
}


def friendly_value(field: str, value, domains: dict[str, dict[str, str]]):
    if value is None:
        return None
    if field in DATE_FIELDS:
        return to_local_datetime(value)
    if field in KEEP_NUMERIC:
        return value
    if field in TRANSLATE_FIELDS:
        if field == "ENABLED":
            return {1: "Yes", 0: "No"}.get(value, value)
        return domains.get(field, {}).get(str(value), value)
    return value


def geometry_points(geom: dict | None):
    """Return (start_lon, start_lat, end_lon, end_lat, geometry_type)."""
    if not geom:
        return None, None, None, None, None
    gtype = geom.get("type")
    coords = geom.get("coordinates") or []
    if gtype == "LineString" and coords:
        return coords[0][0], coords[0][1], coords[-1][0], coords[-1][1], gtype
    if gtype == "MultiLineString" and coords:
        first_line = coords[0]
        last_line = coords[-1]
        if first_line and last_line:
            return (
                first_line[0][0],
                first_line[0][1],
                last_line[-1][0],
                last_line[-1][1],
                gtype,
            )
    return None, None, None, None, gtype


# Export columns: (source field, header, width, kind)
COLUMNS = [
    ("OBJECTID", "OBJECTID", 11, "int"),
    ("DRAINAGE_ID", "DRAINAGE_ID", 12, "int"),
    ("SUBTYPE", "SUBTYPE", 12, "text"),
    ("STATUS", "STATUS", 18, "text"),
    ("OWNERSHIP", "OWNERSHIP", 11, "text"),
    ("MAINTENANCE", "MAINTENANCE", 13, "text"),
    ("WATERSHED", "WATERSHED", 22, "text"),
    ("MATERIAL", "MATERIAL", 28, "text"),
    ("STRUCT_SHAPE", "STRUCT_SHAPE", 17, "text"),
    ("WIDTH", "WIDTH_in", 10, "int"),
    ("HEIGHT", "HEIGHT_in", 10, "int"),
    ("LENGTH", "LENGTH_ft", 11, "num"),
    ("SHAPE.LEN", "SHAPE_LEN_ft", 12, "num"),
    ("YEAR_BUILT", "YEAR_BUILT", 11, "int"),
    ("DATE_BUILT", "DATE_BUILT", 17, "date"),
    ("UP_NODE_ID", "UP_NODE_ID", 11, "int"),
    ("UP_NODE_TYPE", "UP_NODE_TYPE", 18, "text"),
    ("DN_NODE_ID", "DN_NODE_ID", 11, "int"),
    ("DN_NODE_TYPE", "DN_NODE_TYPE", 18, "text"),
    ("SLOPE", "SLOPE", 9, "num"),
    ("SLOPE_EST", "SLOPE_EST", 10, "text"),
    ("UP_INVERT", "UP_INVERT_ft", 12, "num"),
    ("DN_INVERT", "DN_INVERT_ft", 12, "num"),
    ("UP_ELEV_SOURCE", "UP_ELEV_SOURCE", 20, "text"),
    ("DN_ELEV_SOURCE", "DN_ELEV_SOURCE", 20, "text"),
    ("LOCATION_SOURCE", "LOCATION_SOURCE", 24, "text"),
    ("DIMEN_SOURCE", "DIMEN_SOURCE", 20, "text"),
    ("OBSERVATION", "OBSERVATION", 26, "text"),
    ("MODELED", "MODELED", 10, "text"),
    ("REHAB_METHOD", "REHAB_METHOD", 24, "text"),
    ("REHAB_DATE", "REHAB_DATE", 17, "date"),
    ("MAXIMO_ASSET_NUMBER", "MAXIMO_ASSET_NUMBER", 19, "text"),
    ("MAXIMO_SITE_ID", "MAXIMO_SITE_ID", 15, "text"),
    ("COMMENTS", "COMMENTS", 40, "text"),
    ("MAP_INDEX", "MAP_INDEX", 12, "text"),
    ("MAPSCO", "MAPSCO", 10, "text"),
    ("PLACE_ID", "PLACE_ID", 10, "int"),
    ("JTX_JOBID", "JTX_JOBID", 11, "int"),
    ("ENABLED", "ENABLED", 9, "text"),
    ("CREATED_BY", "CREATED_BY", 20, "text"),
    ("CREATED_DATE", "CREATED_DATE", 17, "date"),
    ("MODIFIED_BY", "MODIFIED_BY", 20, "text"),
    ("MODIFIED_DATE", "MODIFIED_DATE", 17, "date"),
    ("CHECKED_BY", "CHECKED_BY", 20, "text"),
    ("EDIT_STATUS", "EDIT_STATUS", 28, "text"),
    ("FME_DATE", "FME_DATE", 17, "date"),
    ("GLOBALID", "GLOBALID", 40, "text"),
    ("START_LON", "START_LON", 12, "coord"),
    ("START_LAT", "START_LAT", 12, "coord"),
    ("END_LON", "END_LON", 12, "coord"),
    ("END_LAT", "END_LAT", 12, "coord"),
]


# ---------------------------------------------------------------------------
# Build row values once, reuse for CSV and XLSX
# ---------------------------------------------------------------------------
def build_rows(features: list[dict], domains: dict[str, dict[str, str]]):
    rows = []
    for feat in features:
        props = feat.get("properties") or {}
        geom = feat.get("geometry")
        slon, slat, elon, elat, gtype = geometry_points(geom)
        values = []
        for field, _header, _width, _kind in COLUMNS:
            if field == "START_LON":
                values.append(slon)
            elif field == "START_LAT":
                values.append(slat)
            elif field == "END_LON":
                values.append(elon)
            elif field == "END_LAT":
                values.append(elat)
            else:
                values.append(friendly_value(field, props.get(field), domains))
        rows.append(values)
    return rows


# ---------------------------------------------------------------------------
# CSV
# ---------------------------------------------------------------------------
def write_csv(rows: list[list], path: str) -> None:
    headers = [c[1] for c in COLUMNS]
    with open(path, "w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.writer(fh, lineterminator="\n")
        writer.writerow(headers)
        for row in rows:
            out = []
            for value, col in zip(row, COLUMNS):
                kind = col[3]
                if value is None:
                    out.append("")
                elif kind == "date" and isinstance(value, datetime):
                    out.append(value.strftime("%Y-%m-%d %H:%M:%S"))
                else:
                    out.append(value)
            writer.writerow(out)
    print(f"  wrote {path}", flush=True)


# ---------------------------------------------------------------------------
# GeoJSON
# ---------------------------------------------------------------------------
def write_geojson(features: list[dict], path: str, count: int) -> None:
    collection = {
        "type": "FeatureCollection",
        "name": "Austin_Private_Drainage_Pipes",
        "source": LAYER_URL,
        "pulled_at_utc": datetime.now(timezone.utc).isoformat(),
        "count": count,
        "features": features,
    }
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(collection, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"  wrote {path}", flush=True)


# ---------------------------------------------------------------------------
# Excel workbook
# ---------------------------------------------------------------------------
def write_xlsx(
    rows: list[list],
    domains: dict[str, dict[str, str]],
    aliases: dict[str, str],
    field_types: dict[str, str],
    meta: dict,
    stats: dict,
) -> None:
    wb = xlsxwriter.Workbook(
        XLSX_PATH,
        {"constant_memory": True, "strings_to_urls": False, "nan_inf_to_errors": True},
    )

    # Formats
    header_fmt = wb.add_format(
        {
            "bold": True,
            "font_color": "#FFFFFF",
            "bg_color": "#1F4E78",
            "border": 1,
            "border_color": "#B7C9D9",
            "text_wrap": True,
            "valign": "vcenter",
            "align": "center",
        }
    )
    text_fmt = wb.add_format({"valign": "top", "border": 1, "border_color": "#DDE6EE"})
    int_fmt = wb.add_format(
        {"num_format": "#,##0", "valign": "top", "border": 1, "border_color": "#DDE6EE"}
    )
    num_fmt = wb.add_format(
        {"num_format": "#,##0.00", "valign": "top", "border": 1, "border_color": "#DDE6EE"}
    )
    coord_fmt = wb.add_format(
        {"num_format": "0.0000000", "valign": "top", "border": 1, "border_color": "#DDE6EE"}
    )
    date_fmt = wb.add_format(
        {
            "num_format": "yyyy-mm-dd hh:mm",
            "valign": "top",
            "border": 1,
            "border_color": "#DDE6EE",
        }
    )
    band_fmt = wb.add_format({"bg_color": "#F2F7FB"})

    ws = wb.add_worksheet("Private Drainage Pipes")
    headers = [c[1] for c in COLUMNS]
    widths = [c[2] for c in COLUMNS]
    for idx, (header, width) in enumerate(zip(headers, widths)):
        ws.write(0, idx, header, header_fmt)
        ws.set_column(idx, idx, width)

    ws.freeze_panes(1, 2)
    ws.autofilter(0, 0, len(rows), len(headers) - 1)
    ws.set_row(0, 34)

    formats = {
        "int": int_fmt,
        "num": num_fmt,
        "coord": coord_fmt,
        "date": date_fmt,
        "text": text_fmt,
    }
    for r_idx, row in enumerate(rows, start=1):
        for c_idx, (value, col) in enumerate(zip(row, COLUMNS)):
            kind = col[3]
            fmt = formats[kind]
            if value is None:
                ws.write_blank(r_idx, c_idx, None, fmt)
            elif kind == "date" and isinstance(value, datetime):
                if value.year < 1900:
                    ws.write(r_idx, c_idx, value.strftime("%Y-%m-%d %H:%M"), fmt)
                else:
                    ws.write_datetime(r_idx, c_idx, value, fmt)
            elif kind in {"int", "num", "coord"} and isinstance(value, (int, float)):
                ws.write_number(r_idx, c_idx, value, fmt)
            else:
                ws.write(r_idx, c_idx, str(value), fmt)

    # Light banding so wide rows are easier to read.
    ws.conditional_format(
        1,
        0,
        len(rows),
        len(headers) - 1,
        {"type": "formula", "criteria": "=MOD(ROW(),2)=0", "format": band_fmt},
    )

    write_summary_sheet(wb, rows, stats)
    write_definitions_sheet(wb, aliases, field_types, domains)
    write_about_sheet(wb, meta, stats)

    wb.close()
    print(f"  wrote {XLSX_PATH}", flush=True)


def write_summary_sheet(wb: xlsxwriter.Workbook, rows: list[list], stats: dict) -> None:
    ws = wb.add_worksheet("Summary")
    title_fmt = wb.add_format({"bold": True, "font_size": 16, "font_color": "#1F4E78"})
    sub_fmt = wb.add_format({"italic": True, "font_color": "#555555"})
    section_fmt = wb.add_format(
        {"bold": True, "font_size": 11, "font_color": "#FFFFFF", "bg_color": "#1F4E78"}
    )
    label_fmt = wb.add_format({"bold": True})
    value_fmt = wb.add_format({"num_format": "#,##0"})
    value_dec_fmt = wb.add_format({"num_format": "#,##0.00"})
    table_head_fmt = wb.add_format(
        {"bold": True, "bg_color": "#D9E2F3", "border": 1, "border_color": "#B7C9D9"}
    )
    table_cell_fmt = wb.add_format({"border": 1, "border_color": "#DDE6EE"})
    table_num_fmt = wb.add_format(
        {"num_format": "#,##0", "border": 1, "border_color": "#DDE6EE"}
    )
    table_pct_fmt = wb.add_format(
        {"num_format": "0.0%", "border": 1, "border_color": "#DDE6EE"}
    )
    table_len_fmt = wb.add_format(
        {"num_format": "#,##0", "border": 1, "border_color": "#DDE6EE"}
    )

    ws.set_column("A:A", 34)
    ws.set_column("B:B", 14)
    ws.set_column("C:C", 12)
    ws.set_column("D:D", 16)

    ws.write("A1", "Austin Private Drainage Pipes — Summary", title_fmt)
    ws.write("A2", "Source: City of Austin FloodPro / Stormdrain Infrastructure (layer 8)", sub_fmt)
    ws.write("A3", f"Pulled: {stats['pulled_at_local']}", sub_fmt)

    r = 5
    ws.write(r, 0, "Metric", section_fmt)
    ws.write(r, 1, "Value", section_fmt)
    r += 1
    for label, value, fmt in [
        ("Total pipe segments", stats["count"], value_fmt),
        ("Unique DRAINAGE_IDs", stats["unique_ids"], value_fmt),
        ("Total geometric length (ft)", stats["total_len_ft"], value_dec_fmt),
        ("Total geometric length (miles)", stats["total_len_mi"], value_dec_fmt),
        ("Mean segment length (ft)", stats["mean_len_ft"], value_dec_fmt),
        ("Longest segment (ft)", stats["max_len_ft"], value_dec_fmt),
        ("Year built range", stats["year_range"], None),
    ]:
        ws.write(r, 0, label, label_fmt)
        ws.write(r, 1, value, fmt) if fmt else ws.write(r, 1, value)
        r += 1

    r += 2
    for title, counter, total in stats["breakdowns"]:
        ws.write(r, 0, title, section_fmt)
        ws.write(r, 1, "Count", section_fmt)
        ws.write(r, 2, "%", section_fmt)
        ws.write(r, 3, "Length (ft)", section_fmt)
        r += 1
        for label, count, length in counter:
            ws.write(r, 0, str(label), table_cell_fmt)
            ws.write_number(r, 1, count, table_num_fmt)
            ws.write_number(r, 2, count / total if total else 0, table_pct_fmt)
            ws.write_number(r, 3, length, table_len_fmt)
            r += 1
        r += 2

    ws.freeze_panes(5, 0)


def write_definitions_sheet(
    wb: xlsxwriter.Workbook,
    aliases: dict[str, str],
    field_types: dict[str, str],
    domains: dict[str, dict[str, str]],
) -> None:
    ws = wb.add_worksheet("Field Definitions")
    header_fmt = wb.add_format(
        {
            "bold": True,
            "font_color": "#FFFFFF",
            "bg_color": "#1F4E78",
            "border": 1,
            "border_color": "#B7C9D9",
            "text_wrap": True,
        }
    )
    cell_fmt = wb.add_format({"border": 1, "border_color": "#DDE6EE", "valign": "top"})
    wrap_fmt = wb.add_format(
        {"border": 1, "border_color": "#DDE6EE", "valign": "top", "text_wrap": True}
    )
    ws.set_column("A:A", 24)
    ws.set_column("B:B", 26)
    ws.set_column("C:C", 26)
    ws.set_column("D:D", 16)
    ws.set_column("E:E", 60)

    headers = ["Export column", "Source field", "ArcGIS alias", "Type", "Notes / coded values"]
    for c, h in enumerate(headers):
        ws.write(0, c, h, header_fmt)
    ws.freeze_panes(1, 0)

    r = 1
    for field, header, _width, _kind in COLUMNS:
        ws.write(r, 0, header, cell_fmt)
        ws.write(r, 1, field, cell_fmt)
        ws.write(r, 2, aliases.get(field, field), cell_fmt)
        ws.write(r, 3, field_types.get(field, ""), cell_fmt)
        note = ""
        if field in domains:
            values = list(domains[field].values())
            if len(values) <= 12:
                note = "; ".join(values)
            else:
                note = f"Coded value domain ({len(values)} values); exported as readable labels"
        elif field in DATE_FIELDS:
            note = "Converted to America/Chicago local time"
        elif field == "START_LON" or field == "START_LAT" or field == "END_LON" or field == "END_LAT":
            note = "WGS84 (EPSG:4326) from the line geometry"
        elif field == "SHAPE.LEN":
            note = "Geometric length in feet"
        ws.write(r, 4, note, wrap_fmt)
        r += 1


def write_about_sheet(wb: xlsxwriter.Workbook, meta: dict, stats: dict) -> None:
    ws = wb.add_worksheet("About & Source")
    title_fmt = wb.add_format({"bold": True, "font_size": 16, "font_color": "#1F4E78"})
    label_fmt = wb.add_format({"bold": True, "valign": "top"})
    wrap_fmt = wb.add_format({"text_wrap": True, "valign": "top"})
    link_fmt = wb.add_format({"font_color": "#0563C1", "underline": 1})
    ws.set_column("A:A", 28)
    ws.set_column("B:B", 100)

    ws.write("A1", "Austin Private Drainage Pipes", title_fmt)
    r = 3
    rows = [
        ("Source page", SOURCE_PAGE),
        ("ArcGIS service", SERVICE_URL),
        ("Layer", f"{LAYER_ID} — {meta.get('name', 'Private Drainage Pipe')}"),
        ("Layer REST URL", LAYER_URL),
        ("Query endpoint", QUERY_URL),
        ("Feature count", f"{stats['count']:,}"),
        ("Unique DRAINAGE_IDs", f"{stats['unique_ids']:,}"),
        ("Total length", f"{stats['total_len_ft']:,.0f} ft ({stats['total_len_mi']:,.2f} miles)"),
        ("Pulled at (US Central)", stats["pulled_at_local"]),
        ("Pulled at (UTC)", stats["pulled_at_utc"]),
        ("Coordinate system", "WGS84 / EPSG:4326 (decimal degrees)"),
        ("Date handling", "ArcGIS epoch milliseconds converted to America/Chicago local time"),
        ("Geometry", "LineString or MultiLineString; START/END columns are line endpoints"),
    ]
    for label, value in rows:
        ws.write(r, 0, label, label_fmt)
        if isinstance(value, str) and value.startswith("http"):
            ws.write_url(r, 1, value, link_fmt, value)
        else:
            ws.write(r, 1, value, wrap_fmt)
        r += 1

    r += 1
    ws.write(r, 0, "Notes", label_fmt)
    notes = [
        "This is the City of Austin's public FloodPro 'Private Drainage Pipe' layer, pulled directly from its ArcGIS REST endpoint. No login or token was required.",
        "The layer represents private storm drainage pipes in the City's inventory. It may not include every private pipe in Austin, and some attributes are blank or 'No Data'.",
        "Coded attributes (status, material, ownership, maintenance, watershed, source, etc.) were translated to the City's readable domain labels.",
        "Lengths: SHAPE_LEN_ft is the GIS line length in feet; LENGTH_ft is the City's attribute value when populated. They can differ.",
        "This export is for reference only. Verify critical information against the City's authoritative records before design, permitting, or excavation.",
    ]
    for note in notes:
        r += 1
        ws.merge_range(r, 0, r, 1, "• " + note, wrap_fmt)
        ws.set_row(r, 30)

    r += 2
    ws.write(r, 0, "Refresh", label_fmt)
    r += 1
    ws.merge_range(
        r,
        0,
        r,
        1,
        "Run  python pull_floodpro_private_pipes.py  in this folder. "
        "It re-downloads all features and rewrites the Excel, CSV, GeoJSON, and metadata files.",
        wrap_fmt,
    )
    ws.set_row(r, 30)


# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------
def build_stats(features: list[dict], rows: list[list], pulled_local: str, pulled_utc: str) -> dict:
    lengths = [
        float(f["properties"].get("SHAPE.LEN") or 0)
        for f in features
        if f.get("properties")
    ]
    total_len = sum(lengths)
    ids = {
        f["properties"].get("DRAINAGE_ID")
        for f in features
        if f.get("properties") and f["properties"].get("DRAINAGE_ID") is not None
    }

    # Column indices for the dimensions we summarize.
    idx = {col[0]: i for i, col in enumerate(COLUMNS)}

    def summarize(field: str, top: int | None = None):
        counts: Counter = Counter()
        lengths_by: dict = {}
        for row in rows:
            label = row[idx[field]]
            label = "(blank)" if label in (None, "") else str(label)
            counts[label] += 1
            try:
                lengths_by[label] = lengths_by.get(label, 0.0) + float(row[idx["SHAPE.LEN"]] or 0)
            except (TypeError, ValueError):
                lengths_by[label] = lengths_by.get(label, 0.0)
        items = [(k, v, lengths_by.get(k, 0.0)) for k, v in counts.most_common(top)]
        return items

    breakdown_specs = [
        ("By subtype", "SUBTYPE", None),
        ("By status", "STATUS", None),
        ("By ownership", "OWNERSHIP", None),
        ("By maintenance", "MAINTENANCE", None),
        ("By material", "MATERIAL", None),
        ("By shape", "STRUCT_SHAPE", None),
        ("By watershed", "WATERSHED", None),
        ("By diameter (inches)", "WIDTH", 25),
    ]
    breakdowns = []
    for title, field, top in breakdown_specs:
        breakdowns.append((title, summarize(field, top), len(rows)))

    years = [
        int(f["properties"]["YEAR_BUILT"])
        for f in features
        if f.get("properties") and f["properties"].get("YEAR_BUILT")
    ]
    year_range = f"{min(years)}–{max(years)}" if years else "No data"

    return {
        "count": len(features),
        "unique_ids": len(ids),
        "total_len_ft": total_len,
        "total_len_mi": total_len / 5280.0,
        "mean_len_ft": total_len / len(lengths) if lengths else 0,
        "max_len_ft": max(lengths) if lengths else 0,
        "year_range": year_range,
        "pulled_at_local": pulled_local,
        "pulled_at_utc": pulled_utc,
        "breakdowns": breakdowns,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--use-cache",
        action="store_true",
        help="reuse _raw_features.json.gz if it matches the current feature count",
    )
    args = parser.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)
    started = time.time()

    print("Fetching layer metadata ...", flush=True)
    meta = get_layer_metadata()
    domains, aliases, field_types = build_domains(meta)
    print(f"  layer: {meta.get('name')} | fields: {len(meta.get('fields', []))}", flush=True)

    print("Counting features ...", flush=True)
    count = get_count()
    print(f"  {count:,} features", flush=True)

    features = load_cache(count) if args.use_cache else None
    if features is None:
        print("Downloading features (2,000 per request) ...", flush=True)
        features = download_features(count)
        save_cache(features, count)
    else:
        print("Using cached download.", flush=True)

    now_utc = datetime.now(timezone.utc)
    pulled_utc = now_utc.strftime("%Y-%m-%d %H:%M:%S UTC")
    pulled_local = now_utc.astimezone(LOCAL_TZ).strftime("%Y-%m-%d %I:%M:%S %p %Z")

    print("Building rows ...", flush=True)
    rows = build_rows(features, domains)
    stats = build_stats(features, rows, pulled_local, pulled_utc)

    print("Writing outputs ...", flush=True)
    write_csv(rows, CSV_PATH)
    write_geojson(features, GEOJSON_PATH, count)
    write_xlsx(rows, domains, aliases, field_types, meta, stats)

    metadata = {
        "source_page": SOURCE_PAGE,
        "service_url": SERVICE_URL,
        "layer_id": LAYER_ID,
        "layer_name": meta.get("name"),
        "layer_url": LAYER_URL,
        "query_url": QUERY_URL,
        "feature_count": count,
        "unique_drainage_ids": stats["unique_ids"],
        "pulled_at_utc": pulled_utc,
        "pulled_at_local": pulled_local,
        "coordinate_system": "WGS84 / EPSG:4326",
        "total_shape_length_ft": round(stats["total_len_ft"], 2),
        "total_shape_length_miles": round(stats["total_len_mi"], 3),
        "mean_segment_length_ft": round(stats["mean_len_ft"], 2),
        "max_segment_length_ft": round(stats["max_len_ft"], 2),
        "year_built_range": stats["year_range"],
        "outputs": {
            "xlsx": os.path.basename(XLSX_PATH),
            "csv": os.path.basename(CSV_PATH),
            "geojson": os.path.basename(GEOJSON_PATH),
        },
    }
    with open(META_PATH, "w", encoding="utf-8") as fh:
        json.dump(metadata, fh, indent=2, ensure_ascii=False)

    print(f"\nDone in {time.time() - started:.1f}s", flush=True)
    print(f"  {XLSX_PATH}", flush=True)
    print(f"  {CSV_PATH}", flush=True)
    print(f"  {GEOJSON_PATH}", flush=True)
    print(f"  {META_PATH}", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nCancelled.", file=sys.stderr)
        raise SystemExit(130)
