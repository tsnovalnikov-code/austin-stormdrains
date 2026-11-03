with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'r') as f:
    content = f.read()

# Replace the header section
old_header = '''#!/usr/bin/env python3
"""Build a single-file interactive explorer for the Austin private drainage pipes.

Reads the CSV (attributes) and GeoJSON (line geometry) produced by the
FloodPro puller and writes a self-contained HTML file with the data embedded.

Usage:
    python build_explorer.py
"""

from __future__ import annotations

import csv
import json
import math
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILD = Path(__file__).resolve().parent
CSV_PATH = ROOT / "Austin_Private_Drainage_Pipes.csv"
GEOJSON_PATH = ROOT / "Austin_Private_Drainage_Pipes.geojson"
META_PATH = ROOT / "metadata.json"
TEMPLATE_PATH = BUILD / "template.html"
APP_JS_PATH = BUILD / "app.js"
DATA_JS_PATH = BUILD / "data.js"
OUTPUT_PATH = ROOT / "Austin_Private_Drainage_Pipes_Explorer.html"

APP_PARTS = [
    BUILD / "app-00-core.js",
    BUILD / "app-10-ui.js",
    BUILD / "app-11-detail.js",
    BUILD / "app-20-map.js",
    BUILD / "app-30-init.js",
]

# Categorical columns that are dictionary-encoded in the embedded data.
CAT_FIELDS = {
    "subtype": "SUBTYPE",
    "maintenance": "MAINTENANCE",
    "watershed": "WATERSHED",
    "material": "MATERIAL",
    "shape": "STRUCT_SHAPE",
    "upNodeType": "UP_NODE_TYPE",
    "dnNodeType": "DN_NODE_TYPE",
    "locSource": "LOCATION_SOURCE",
    "dimSource": "DIMEN_SOURCE",
}'''

new_header = '''#!/usr/bin/env python3
"""Build a single-file interactive explorer for Austin drainage pipes.

Reads the CSV (attributes) and GeoJSON (line geometry) and writes a
self-contained HTML file with the data embedded.

Usage:
    python build_explorer.py [floodpro|arcgis]

Defaults to floodpro.
"""

from __future__ import annotations

import csv
import json
import math
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILD = Path(__file__).resolve().parent
TEMPLATE_PATH = BUILD / "template.html"
APP_JS_PATH = BUILD / "app.js"
DATA_JS_PATH = BUILD / "data.js"

APP_PARTS = [
    BUILD / "app-00-core.js",
    BUILD / "app-10-ui.js",
    BUILD / "app-11-detail.js",
    BUILD / "app-20-map.js",
    BUILD / "app-30-init.js",
]

# Categorical columns that are dictionary-encoded in the embedded data.
CAT_FIELDS = {
    "subtype": "SUBTYPE",
    "maintenance": "MAINTENANCE",
    "watershed": "WATERSHED",
    "material": "MATERIAL",
    "shape": "STRUCT_SHAPE",
    "upNodeType": "UP_NODE_TYPE",
    "dnNodeType": "DN_NODE_TYPE",
    "locSource": "LOCATION_SOURCE",
    "dimSource": "DIMEN_SOURCE",
}

# Dataset configurations
DATASETS = {
    "floodpro": {
        "csv": ROOT / "Austin_FloodPro_Drainage_Pipes.csv",
        "geojson": ROOT / "Austin_FloodPro_Drainage_Pipes.geojson",
        "meta": ROOT / "metadata_floodpro_merged.json",
        "output": ROOT / "Austin_FloodPro_Drainage_Pipes_Explorer.html",
        "title": "Austin FloodPro Drainage Pipes",
        "subtitle": "FloodPro layers 7+8 · interactive explorer",
        "source_page": "https://maps.austintexas.gov/floodpro/",
        "source_label": "FloodPro",
        "source_url": "https://maps.austintexas.gov/arcgis/rest/services/FloodPro/Stormdrain_Infrastructure/MapServer",
        "other_dataset": "arcgis",
        "other_label": "ArcGIS",
        "other_title": "Austin ArcGIS Drainage Pipes",
        "other_output": "Austin_ArcGIS_Drainage_Pipes_Explorer.html",
    },
    "arcgis": {
        "csv": ROOT / "Austin_ArcGIS_Drainage_Pipes.csv",
        "geojson": ROOT / "Austin_ArcGIS_Drainage_Pipes.geojson",
        "meta": ROOT / "metadata_arcgis.json",
        "output": ROOT / "Austin_ArcGIS_Drainage_Pipes_Explorer.html",
        "title": "Austin ArcGIS Drainage Pipes",
        "subtitle": "ArcGIS-hosted FeatureServer · interactive explorer",
        "source_page": "https://www.arcgis.com/home/item.html?id=c75669e7185b4a7593fb397b67cbaa43",
        "source_label": "ArcGIS",
        "source_url": "https://services.arcgis.com/0L95CJ0VTaxqcmED/arcgis/rest/services/UTILITIESCOMMUNICATION_DrainagePipe/FeatureServer/0",
        "other_dataset": "floodpro",
        "other_label": "FloodPro",
        "other_title": "Austin FloodPro Drainage Pipes",
        "other_output": "Austin_FloodPro_Drainage_Pipes_Explorer.html",
    },
}'''

if old_header not in content:
    print("ERROR: Could not find old header in file")
    print("First 500 chars:")
    print(repr(content[:500]))
else:
    content = content.replace(old_header, new_header)
    with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'w') as f:
        f.write(content)
    print("Header replaced successfully")
