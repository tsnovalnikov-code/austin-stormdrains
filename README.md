# Austin FloodPro — Private Drainage Pipes

Pulled from the City of Austin **FloodPro** map: <https://maps.austintexas.gov/floodpro/>

The public viewer is a Geocortex wrapper around an ArcGIS REST service. No login or token is required. The private pipes are **layer 8** of the `FloodPro/Stormdrain_Infrastructure` MapServer.

## Files

| File | What it is |
|---|---|
| `Austin_Private_Drainage_Pipes.xlsx` | Formatted workbook: all 59,259 segments, summary tables, field definitions, source notes |
| `Austin_Private_Drainage_Pipes.csv` | Same data as a UTF-8 CSV (opens cleanly in Excel) |
| `Austin_Private_Drainage_Pipes.geojson` | Same data with line geometry in WGS84 (EPSG:4326) |
| `metadata.json` | Pull timestamp, counts, source URLs, total length |
| `pull_floodpro_private_pipes.py` | Reusable downloader / exporter |
| `_raw_features.json.gz` | Cached raw download (used by `--use-cache`) |

## Snapshot

- **59,259** private drainage pipe segments
- **59,259** unique `DRAINAGE_ID` values
- **4,652,492 ft** of pipe (about **881.15 miles**) by GIS line length
- Year built range: **1915–2025**
- Subtypes: 48,816 storm drain, 7,200 culvert, 3,243 lateral
- All records are `STATUS = Active` and `OWNERSHIP = Other` (private)
- Maintenance: 46,519 Other, 12,728 TxDOT, 12 City of Austin

## How the pull works

Layer metadata:

```text
https://maps.austintexas.gov/arcgis/rest/services/FloodPro/Stormdrain_Infrastructure/MapServer/8?f=pjson
```

Query endpoint:

```text
https://maps.austintexas.gov/arcgis/rest/services/FloodPro/Stormdrain_Infrastructure/MapServer/8/query
```

Example request (first 2,000 features as GeoJSON):

```text
https://maps.austintexas.gov/arcgis/rest/services/FloodPro/Stormdrain_Infrastructure/MapServer/8/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&orderByFields=OBJECTID%20ASC&resultOffset=0&resultRecordCount=2000&f=geojson
```

The service caps each response at **2,000** features, so the script pages with `resultOffset` until all 59,259 are downloaded. `orderByFields=OBJECTID ASC` keeps the pages stable. It validates that the downloaded count and unique `OBJECTID` count both equal the service count before writing anything.

## Refresh the data

```powershell
cd "C:\Users\Tim S\Downloads\the\floodpro_private_pipes"
python pull_floodpro_private_pipes.py
```

Reuse the cached raw download (faster, skips the 30 HTTP requests):

```powershell
python pull_floodpro_private_pipes.py --use-cache
```

Requirements: Python 3.9+ and `xlsxwriter` (`python -m pip install xlsxwriter`).

## Spreadsheet notes

- **Coded fields are translated** to the City's readable labels (e.g. `PROUTFALL` → `Private Header`, `NO_SOURCE` → `7-No source`, `SLA` → `Slaughter Creek`). The REST API itself returns the raw codes.
- **Dates** are ArcGIS epoch milliseconds converted to US Central time (`America/Chicago`). Example: `DRAINAGE_ID 700875` shows `CREATED_DATE 2014-05-28 10:31`, matching the FloodPro popup.
- **`SHAPE_LEN_ft`** is the GIS line length in feet. **`LENGTH_ft`** is the City's own length attribute, which is often blank.
- **`WIDTH_in` / `HEIGHT_in`** are numeric inches (the City's domain labels include the inch symbol).
- **`START_LON/LAT` and `END_LON/LAT`** are the line endpoints in WGS84 decimal degrees.
- The `Summary` sheet has counts, percentages, and total length by subtype, status, ownership, maintenance, material, shape, watershed, and diameter.
- The `Field Definitions` sheet maps every export column back to its ArcGIS field and lists coded-value meanings.

## Other stormdrain layers in the same service

If you need the public system too, the same pattern works for:

| Layer | Name |
|---:|---|
| 0 | Curb Inlet |
| 1 | Grate Inlet |
| 2 | Combo Inlet |
| 3 | Bridge Inlet |
| 4 | Linear Drain |
| 5 | Header |
| 6 | Manhole |
| 7 | Drainage Pipe (public) |
| 8 | Private Drainage Pipe |
| 9 | Open Channel |

Change the layer number in the URL, e.g. layer 7 for public drainage pipe. Each layer can be queried the same way.

## Filtering examples

ArcGIS `where` clauses use the raw codes, not the translated labels:

- One watershed: `where=WATERSHED='SLA'`
- Built since 2010: `where=YEAR_BUILT>=2010`
- Reinforced concrete: `where=MATERIAL='RCP'`
- Large pipes: `where=WIDTH>=36`
- TxDOT-maintained: `where=MAINTENANCE='TXDOT'`

Append the clause to the query URL as the `where` parameter, URL-encoded.

## Caveats

- This is the City's public inventory of **private** storm drainage pipes. It may not contain every private pipe in Austin, and many attributes are blank or `No Data`.
- The layer is published for reference/mapping, not as a substitute for field survey, as-built records, or utility locate requests.
- Verify critical information against City of Austin records before design, permitting, or excavation. Call 811 before digging.
