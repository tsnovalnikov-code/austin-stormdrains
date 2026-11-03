#!/usr/bin/env python3
"""
Merge FloodPro layer 7 (public) and layer 8 (private) drainage pipes into a
single dataset matching the existing private-pipe CSV/GeoJSON schema.

Reads:
  Austin_Public_Drainage_Pipes.csv  (layer 7, raw codes + epoch dates)
  Austin_Public_Drainage_Pipes.geojson
  Austin_Private_Drainage_Pipes.csv  (layer 8, already translated)
  Austin_Private_Drainage_Pipes.geojson

Writes:
  Austin_FloodPro_Drainage_Pipes.csv      (merged, translated)
  Austin_FloodPro_Drainage_Pipes.geojson  (merged)
  metadata_floodpro_merged.json
"""

from __future__ import annotations

import csv
import json
import os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.abspath(__file__))
LOCAL_TZ = ZoneInfo("America/Chicago")

PUBLIC_CSV = os.path.join(ROOT, "Austin_Public_Drainage_Pipes.csv")
PUBLIC_GEOJSON = os.path.join(ROOT, "Austin_Public_Drainage_Pipes.geojson")
PRIVATE_CSV = os.path.join(ROOT, "Austin_Private_Drainage_Pipes.csv")
PRIVATE_GEOJSON = os.path.join(ROOT, "Austin_Private_Drainage_Pipes.geojson")

OUT_CSV = os.path.join(ROOT, "Austin_FloodPro_Drainage_Pipes.csv")
OUT_GEOJSON = os.path.join(ROOT, "Austin_FloodPro_Drainage_Pipes.geojson")
OUT_META = os.path.join(ROOT, "metadata_floodpro_merged.json")

# SUBTYPE codes from the FloodPro data dictionary
SUBTYPE_MAP = {
    "1": "Storm Drain",
    "2": "Culvert",
    "3": "Lateral",
}

# MAINTENANCE codes
MAINTENANCE_MAP = {
    "CITY": "City of Austin",
    "OTHER": "Other",
    "TXDOT": "TxDOT",
}

# OWNERSHIP codes
OWNERSHIP_MAP = {
    "CITY": "City",
    "OTHER": "Other",
}

# STATUS codes
STATUS_MAP = {
    "ACTIVE": "Active",
}

# Watershed code → full name (from the private data dictionary)
WATERSHED_MAP = {
    "BER": "Bear Creek",
    "LKA": "Lake Austin",
    "SHL": "Shoal Creek",
    "WAL": "Waller Creek",
    "ONI": "Onion Creek",
    "SLA": "Slaughter Creek",
    "BGC": "Boggy Creek",
    "BUT": "Bull Creek",
    "WIL": "Williamson Creek",
    "WBC": "West Bouldin Creek",
    "EBC": "East Bouldin Creek",
    "TAN": "Tannehill Branch",
    "HAR": "Harper's Branch",
    "FOR": "Fort Branch",
    "JOH": "Johnson Creek",
    "WAL": "Walnut Creek",
    "LIT": "Little Walnut Creek",
    "RAT": "Rattan Creek",
    "BLU": "Blunn Creek",
    "CAR": "Carson Creek",
    "COL": "Colorado River",
    "CON": "Connors Creek",
    "COT": "Cottonmouth Creek",
    "CCE": "Country Club East",
    "CCW": "Country Club West",
    "DEC": "Decker Creek",
    "DRY": "Dry Creek East",
    "DRN": "Dry Creek North",
    "EAN": "Eanes Creek",
    "ELM": "Elm Creek",
    "GIL": "Gilleland Creek",
    "HOG": "Hog Pen Creek",
    "HUC": "Huck's Slough",
    "HHA": "Harrison Hollow",
    "HAB": "Harris Branch",
    "LAK": "Lake Travis",
    "LCR": "Lake Creek",
    "LBB": "LBL",
    "LBE": "Little Bee Creek",
    "MAR": "Marble Creek",
    "NFD": "North Fork Dry Creek",
    "PAN": "Panther Hollow",
    "RIN": "Rinard Creek",
    "RDE": "Running Deer Creek",
    "SBC": "South Boggy Creek",
    "SBR": "South Brushy Creek",
    "STS": "St. Stephens Creek",
    "TSN": "Taylor Slough North",
    "TSS": "Taylor Slough South",
    "TLK": "Town Lake",
    "TUR": "Turkey Creek",
    "WBR": "West Brushy Creek",
    "WBU": "West Bull Creek",
    "BRC": "Bear Creek West",
    "BEE": "Bee Creek",
    "BRU": "Brushy Creek",
    "BRU": "Buttercup Creek",
    "BRN": "Buttermilk Branch",
    "COLD": "Coldwater Creek",
    "NODATA": "No Data",
}

MATERIAL_MAP = {
    "RCP": "Reinforced Concrete Pipe (RCP)",
    "CGMP": "Corrugated Galvanized Metal Pipe (CGMP)",
    "CONC": "Concrete",
    "HDPE": "High-density Polyethylene (HDPE)",
    "PVC": "PVC",
    "CI": "Cast Iron (CI)",
    "DI": "Ductile Iron (DI)",
    "CLAY": "Clay",
    "STL": "Steel",
    "BRKCONC": "Brick/Concrete",
    "TIN": "Tin",
    "BRK": "Brick",
    "NODATA": "No Data",
}

SHAPE_MAP = {
    "CIRCULAR": "Circular",
    "RECTANGULAR": "Rectangular (Box)",
    "PIPE-ARCH": "Pipe-arch",
    "ELLIPTICAL": "Elliptical",
    "CONE": "Cone",
    "NODATA": "No Data",
}


def epoch_ms_to_date(ms) -> str | None:
    """Convert ArcGIS epoch milliseconds to 'YYYY-MM-DD HH:MM:SS' string."""
    if ms is None or ms == "" or ms == "null":
        return None
    try:
        ms = float(ms)
    except (TypeError, ValueError):
        return None
    if ms <= 0:
        return None
    dt = datetime.fromtimestamp(ms / 1000.0, tz=timezone.utc).astimezone(LOCAL_TZ)
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def translate(value, mapping, default=None):
    if value is None or value == "":
        return default
    v = str(value).strip().upper()
    return mapping.get(v, default if default is not None else value)


def load_public() -> tuple[list[dict], list[dict]]:
    """Load and normalize public (layer 7) data."""
    with open(PUBLIC_CSV, "r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    with open(PUBLIC_GEOJSON, "r", encoding="utf-8") as f:
        geojson = json.load(f)
    features = geojson.get("features", [])
    geom_by_oid = {}
    for feat in features:
        oid = int(feat["properties"]["OBJECTID"])
        geom_by_oid[oid] = feat.get("geometry")

    normalized = []
    for row in rows:
        oid = int(row["OBJECTID"])
        geometry = geom_by_oid.get(oid)

        n = {
            "OBJECTID": oid,
            "DRAINAGE_ID": int(row["DRAINAGE_ID"]) if row.get("DRAINAGE_ID") else None,
            "JTX_JOBID": int(row["JTX_JOBID"]) if row.get("JTX_JOBID") else None,
            "COMMENTS": row.get("COMMENTS") or None,
            "UP_NODE_ID": int(row["UP_NODE_ID"]) if row.get("UP_NODE_ID") else None,
            "DN_NODE_ID": int(row["DN_NODE_ID"]) if row.get("DN_NODE_ID") else None,
            "UP_NODE_TYPE": row.get("UP_NODE_TYPE") or None,
            "DN_NODE_TYPE": row.get("DN_NODE_TYPE") or None,
            "CREATED_BY": row.get("CREATED_BY") or None,
            "CREATED_DATE": epoch_ms_to_date(row.get("CREATED_DATE")),
            "MODIFIED_BY": row.get("MODIFIED_BY") or None,
            "MODIFIED_DATE": epoch_ms_to_date(row.get("MODIFIED_DATE")),
            "CHECKED_BY": row.get("CHECKED_BY") or None,
            "WATERSHED": translate(row.get("WATERSHED"), WATERSHED_MAP, row.get("WATERSHED") or "No Data"),
            "MAP_INDEX": row.get("MAP_INDEX") or None,
            "MAPSCO": row.get("MAPSCO") or None,
            "DATE_BUILT": epoch_ms_to_date(row.get("DATE_BUILT")),
            "YEAR_BUILT": int(row["YEAR_BUILT"]) if row.get("YEAR_BUILT") else None,
            "YEAR_SOURCE": row.get("YEAR_SOURCE") or None,
            "YEAR_ABANDONED": int(row["YEAR_ABANDONED"]) if row.get("YEAR_ABANDONED") else None,
            "LOCATION_SOURCE": row.get("LOCATION_SOURCE") or None,
            "PLACE_ID": int(row["PLACE_ID"]) if row.get("PLACE_ID") else None,
            "OBSERVATION": row.get("OBSERVATION") or None,
            "DIMEN_SOURCE": row.get("DIMEN_SOURCE") or None,
            "UP_ELEV_SOURCE": row.get("UP_ELEV_SOURCE") or None,
            "DN_ELEV_SOURCE": row.get("DN_ELEV_SOURCE") or None,
            "UP_INVERT_ft": float(row["UP_INVERT"]) if row.get("UP_INVERT") else None,
            "DN_INVERT_ft": float(row["DN_INVERT"]) if row.get("DN_INVERT") else None,
            "SLOPE": float(row["SLOPE"]) if row.get("SLOPE") else None,
            "SLOPE_EST": row.get("SLOPE_EST") or None,
            "LENGTH_ft": int(row["LENGTH"]) if row.get("LENGTH") else None,
            "SHAPE_LEN_ft": float(row["SHAPE.LEN"]) if row.get("SHAPE.LEN") else None,
            "OWNERSHIP": translate(row.get("OWNERSHIP"), OWNERSHIP_MAP, row.get("OWNERSHIP") or "Other"),
            "MAINTENANCE": translate(row.get("MAINTENANCE"), MAINTENANCE_MAP, row.get("MAINTENANCE") or "Other"),
            "STRUCT_SHAPE": translate(row.get("STRUCT_SHAPE"), SHAPE_MAP, row.get("STRUCT_SHAPE") or "No Data"),
            "WIDTH_in": int(row["WIDTH"]) if row.get("WIDTH") else None,
            "HEIGHT_in": int(row["HEIGHT"]) if row.get("HEIGHT") else None,
            "MATERIAL": translate(row.get("MATERIAL"), MATERIAL_MAP, row.get("MATERIAL") or "No Data"),
            "SUBTYPE": translate(row.get("SUBTYPE"), SUBTYPE_MAP, "Storm Drain"),
            "GLOBALID": row.get("GLOBALID") or None,
            "EDIT_STATUS": row.get("EDIT_STATUS") or None,
            "FME_DATE": epoch_ms_to_date(row.get("FME_DATE")),
            "STATUS": translate(row.get("STATUS"), STATUS_MAP, row.get("STATUS") or "Active"),
            "MODELED": row.get("MODELED") or None,
            "REHAB_METHOD": row.get("REHAB_METHOD") or None,
            "REHAB_DATE": epoch_ms_to_date(row.get("REHAB_DATE")),
            "MAXIMO_ASSET_NUMBER": row.get("MAXIMO_ASSET_NUMBER") or None,
            "MAXIMO_SITE_ID": row.get("MAXIMO_SITE_ID") or None,
            "ENABLED": int(row["ENABLED"]) if row.get("ENABLED") else None,
            "SOURCE": "Public",
            "geometry": geometry,
        }
        normalized.append(n)

    return normalized, rows


def load_private() -> tuple[list[dict], list[dict]]:
    """Load private (layer 8) data - already translated."""
    with open(PRIVATE_CSV, "r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    with open(PRIVATE_GEOJSON, "r", encoding="utf-8") as f:
        geojson = json.load(f)
    features = geojson.get("features", [])
    geom_by_oid = {}
    for feat in features:
        oid = int(feat["properties"]["OBJECTID"])
        geom_by_oid[oid] = feat.get("geometry")

    normalized = []
    for row in rows:
        oid = int(row["OBJECTID"])
        geometry = geom_by_oid.get(oid)

        n = {
            "OBJECTID": oid,
            "DRAINAGE_ID": int(row["DRAINAGE_ID"]) if row.get("DRAINAGE_ID") else None,
            "JTX_JOBID": int(row["JTX_JOBID"]) if row.get("JTX_JOBID") else None,
            "COMMENTS": row.get("COMMENTS") or None,
            "UP_NODE_ID": int(row["UP_NODE_ID"]) if row.get("UP_NODE_ID") else None,
            "DN_NODE_ID": int(row["DN_NODE_ID"]) if row.get("DN_NODE_ID") else None,
            "UP_NODE_TYPE": row.get("UP_NODE_TYPE") or None,
            "DN_NODE_TYPE": row.get("DN_NODE_TYPE") or None,
            "CREATED_BY": row.get("CREATED_BY") or None,
            "CREATED_DATE": row.get("CREATED_DATE") or None,
            "MODIFIED_BY": row.get("MODIFIED_BY") or None,
            "MODIFIED_DATE": row.get("MODIFIED_DATE") or None,
            "CHECKED_BY": row.get("CHECKED_BY") or None,
            "WATERSHED": row.get("WATERSHED") or "No Data",
            "MAP_INDEX": row.get("MAP_INDEX") or None,
            "MAPSCO": row.get("MAPSCO") or None,
            "DATE_BUILT": row.get("DATE_BUILT") or None,
            "YEAR_BUILT": int(row["YEAR_BUILT"]) if row.get("YEAR_BUILT") else None,
            "YEAR_SOURCE": row.get("YEAR_SOURCE") or None,
            "YEAR_ABANDONED": int(row["YEAR_ABANDONED"]) if row.get("YEAR_ABANDONED") else None,
            "LOCATION_SOURCE": row.get("LOCATION_SOURCE") or None,
            "PLACE_ID": int(row["PLACE_ID"]) if row.get("PLACE_ID") else None,
            "OBSERVATION": row.get("OBSERVATION") or None,
            "DIMEN_SOURCE": row.get("DIMEN_SOURCE") or None,
            "UP_ELEV_SOURCE": row.get("UP_ELEV_SOURCE") or None,
            "DN_ELEV_SOURCE": row.get("DN_ELEV_SOURCE") or None,
            "UP_INVERT_ft": float(row["UP_INVERT_ft"]) if row.get("UP_INVERT_ft") else None,
            "DN_INVERT_ft": float(row["DN_INVERT_ft"]) if row.get("DN_INVERT_ft") else None,
            "SLOPE": float(row["SLOPE"]) if row.get("SLOPE") else None,
            "SLOPE_EST": row.get("SLOPE_EST") or None,
            "LENGTH_ft": int(row["LENGTH_ft"]) if row.get("LENGTH_ft") else None,
            "SHAPE_LEN_ft": float(row["SHAPE_LEN_ft"]) if row.get("SHAPE_LEN_ft") else None,
            "OWNERSHIP": row.get("OWNERSHIP") or "Other",
            "MAINTENANCE": row.get("MAINTENANCE") or "Other",
            "STRUCT_SHAPE": row.get("STRUCT_SHAPE") or "No Data",
            "WIDTH_in": int(row["WIDTH_in"]) if row.get("WIDTH_in") else None,
            "HEIGHT_in": int(row["HEIGHT_in"]) if row.get("HEIGHT_in") else None,
            "MATERIAL": row.get("MATERIAL") or "No Data",
            "SUBTYPE": row.get("SUBTYPE") or "Storm Drain",
            "GLOBALID": row.get("GLOBALID") or None,
            "EDIT_STATUS": row.get("EDIT_STATUS") or None,
            "FME_DATE": row.get("FME_DATE") or None,
            "STATUS": row.get("STATUS") or "Active",
            "MODELED": row.get("MODELED") or None,
            "REHAB_METHOD": row.get("REHAB_METHOD") or None,
            "REHAB_DATE": row.get("REHAB_DATE") or None,
            "MAXIMO_ASSET_NUMBER": row.get("MAXIMO_ASSET_NUMBER") or None,
            "MAXIMO_SITE_ID": row.get("MAXIMO_SITE_ID") or None,
            "ENABLED": int(row["ENABLED"]) if row.get("ENABLED") else None,
            "SOURCE": "Private",
            "geometry": geometry,
        }
        normalized.append(n)

    return normalized, rows


def main():
    print("Loading public (layer 7) data...")
    public_rows, public_raw = load_public()
    print(f"  {len(public_rows):,} public segments")

    print("Loading private (layer 8) data...")
    private_rows, private_raw = load_private()
    print(f"  {len(private_rows):,} private segments")

    # Merge
    all_rows = public_rows + private_rows
    print(f"  {len(all_rows):,} total merged segments")

    # Determine field order (matching the existing private CSV schema)
    field_order = [
        "OBJECTID", "DRAINAGE_ID", "SUBTYPE", "STATUS", "OWNERSHIP", "MAINTENANCE",
        "WATERSHED", "MATERIAL", "STRUCT_SHAPE", "WIDTH_in", "HEIGHT_in",
        "LENGTH_ft", "SHAPE_LEN_ft", "YEAR_BUILT", "DATE_BUILT",
        "UP_NODE_ID", "UP_NODE_TYPE", "DN_NODE_ID", "DN_NODE_TYPE",
        "SLOPE", "SLOPE_EST", "UP_INVERT_ft", "DN_INVERT_ft",
        "UP_ELEV_SOURCE", "DN_ELEV_SOURCE", "LOCATION_SOURCE", "DIMEN_SOURCE",
        "OBSERVATION", "MODELED", "REHAB_METHOD", "REHAB_DATE",
        "MAXIMO_ASSET_NUMBER", "MAXIMO_SITE_ID", "COMMENTS",
        "MAP_INDEX", "MAPSCO", "PLACE_ID", "JTX_JOBID", "ENABLED",
        "CREATED_BY", "CREATED_DATE", "MODIFIED_BY", "MODIFIED_DATE",
        "CHECKED_BY", "EDIT_STATUS", "FME_DATE", "GLOBALID",
        "START_LON", "START_LAT", "END_LON", "END_LAT", "SOURCE",
    ]

    # Write merged CSV
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=field_order, extrasaction="ignore")
        writer.writeheader()
        for row in all_rows:
            # Extract start/end lon/lat from geometry
            geom = row.pop("geometry", None)
            if geom and geom.get("coordinates"):
                coords = geom["coordinates"]
                row["START_LON"] = coords[0][0]
                row["START_LAT"] = coords[0][1]
                row["END_LON"] = coords[-1][0]
                row["END_LAT"] = coords[-1][1]
            else:
                row["START_LON"] = ""
                row["START_LAT"] = ""
                row["END_LON"] = ""
                row["END_LAT"] = ""
            writer.writerow(row)
            # Restore geometry for GeoJSON writing
            row["geometry"] = geom

    print(f"Wrote {OUT_CSV}")

    # Write merged GeoJSON
    features_out = []
    for row in all_rows:
        geom = row.pop("geometry", None)
        props = {k: v for k, v in row.items() if k != "geometry"}
        features_out.append({
            "type": "Feature",
            "id": row["OBJECTID"],
            "geometry": geom,
            "properties": props,
        })
        row["geometry"] = geom  # restore

    fc = {
        "type": "FeatureCollection",
        "name": "Austin_FloodPro_Drainage_Pipes",
        "source": "https://maps.austintexas.gov/arcgis/rest/services/FloodPro/Stormdrain_Infrastructure/MapServer",
        "layers": [7, 8],
        "pulled_at_utc": datetime.now(timezone.utc).isoformat(),
        "count": len(features_out),
        "features": features_out,
    }
    with open(OUT_GEOJSON, "w", encoding="utf-8") as f:
        json.dump(fc, f)
    print(f"Wrote {OUT_GEOJSON}")

    # Compute stats
    total_length = sum(r["SHAPE_LEN_ft"] or 0 for r in all_rows)
    years = [r["YEAR_BUILT"] for r in all_rows if r["YEAR_BUILT"]]
    widths = [r["WIDTH_in"] for r in all_rows if r["WIDTH_in"]]
    heights = [r["HEIGHT_in"] for r in all_rows if r["HEIGHT_in"]]
    lengths = [r["SHAPE_LEN_ft"] for r in all_rows if r["SHAPE_LEN_ft"]]

    meta = {
        "source_page": "https://maps.austintexas.gov/floodpro/",
        "service_url": "https://maps.austintexas.gov/arcgis/rest/services/FloodPro/Stormdrain_Infrastructure/MapServer",
        "layers": [7, 8],
        "layer_names": {7: "Drainage Pipe (public)", 8: "Private Drainage Pipe"},
        "feature_count": len(all_rows),
        "public_count": len(public_rows),
        "private_count": len(private_rows),
        "pulled_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "pulled_at_local": datetime.now(LOCAL_TZ).strftime("%Y-%m-%d %I:%M:%S %p %Z"),
        "coordinate_system": "WGS84 / EPSG:4326",
        "total_shape_length_ft": round(total_length, 2),
        "total_shape_length_miles": round(total_length / 5280, 2),
        "year_built_range": f"{min(years)}–{max(years)}" if years else "—",
        "width_range": f"{min(widths)}–{max(widths)}\"" if widths else "—",
        "height_range": f"{min(heights)}–{max(heights)}\"" if heights else "—",
        "outputs": {
            "csv": "Austin_FloodPro_Drainage_Pipes.csv",
            "geojson": "Austin_FloodPro_Drainage_Pipes.geojson",
        },
    }
    with open(OUT_META, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print(f"Wrote {OUT_META}")
    print(f"\nMerged: {len(public_rows):,} public + {len(private_rows):,} private = {len(all_rows):,} total")
    print(f"Total length: {total_length:,.1f} ft ({total_length/5280:,.2f} miles)")


if __name__ == "__main__":
    main()
