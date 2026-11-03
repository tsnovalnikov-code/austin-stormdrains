with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'r') as f:
    content = f.read()

# Insert build_dataset function before main()
marker = '\ndef main() -> int:'
idx = content.find(marker)
if idx == -1:
    print("ERROR: Could not find main()")
else:
    build_dataset_func = '''

def build_dataset(key: str) -> int:
    cfg = DATASETS[key]
    CSV_PATH = cfg["csv"]
    GEOJSON_PATH = cfg["geojson"]
    META_PATH = cfg["meta"]
    OUTPUT_PATH = cfg["output"]

    print(f"Building {key} dataset...")
    print(f"Reading {CSV_PATH.name} ...")
    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    print(f"  {len(rows):,} attribute rows")

    print(f"Reading {GEOJSON_PATH.name} ...")
    with GEOJSON_PATH.open("r", encoding="utf-8") as f:
        geojson = json.load(f)
    features = geojson.get("features", [])
    print(f"  {len(features):,} geometry features")

    geom_by_oid: dict[int, list[list[float]]] = {}
    for feature in features:
        oid = int(feature["properties"]["OBJECTID"])
        geometry = feature.get("geometry") or {}
        if geometry.get("type") != "LineString":
            raise ValueError(f"OBJECTID {oid}: unexpected geometry {geometry.get('type')!r}")
        coords = geometry.get("coordinates") or []
        if len(coords) < 2:
            raise ValueError(f"OBJECTID {oid}: LineString has fewer than 2 points")
        geom_by_oid[oid] = coords

    if len(geom_by_oid) != len(features):
        raise ValueError("Duplicate OBJECTID values in GeoJSON")

    dicts: dict[str, list[str]] = {}
    indexes: dict[str, dict[str, int]] = {}
    for dict_key, column in CAT_FIELDS.items():
        values, index = build_dictionary(
            rows,
            column,
            alphabetical=(dict_key == "watershed"),
        )
        dicts[dict_key] = values
        indexes[dict_key] = index
        print(f"  {dict_key}: {len(values)} categories")

    out_rows: list[list] = []
    total_length = 0.0
    min_lat = min_lon = math.inf
    max_lat = max_lon = -math.inf
    year_min = math.inf
    year_max = -math.inf
    width_min = math.inf
    width_max = -math.inf
    height_min = math.inf
    height_max = -math.inf
    length_min = math.inf
    length_max = -math.inf
    created_min: str | None = None
    created_max: str | None = None
    modified_min: str | None = None
    modified_max: str | None = None
    missing_geometry = 0

    for row in rows:
        oid = int(row["OBJECTID"])
        coords = geom_by_oid.get(oid)
        if coords is None:
            missing_geometry += 1
            continue

        def cat(dict_key: str) -> int:
            value = clean(row.get(CAT_FIELDS[dict_key]))
            if not value and dict_key == "watershed":
                value = "No Data"
            return indexes[dict_key].get(value, -1)

        width = number(row.get("WIDTH_in"), zero_is_null=True)
        height = number(row.get("HEIGHT_in"), zero_is_null=True)
        length = number(row.get("SHAPE_LEN_ft"))
        year = number(row.get("YEAR_BUILT"))
        built = date_part(row.get("DATE_BUILT"))
        created = clean(row.get("CREATED_DATE")) or None
        modified = clean(row.get("MODIFIED_DATE")) or None
        comments = clean(row.get("COMMENTS")) or None
        up_node = number(row.get("UP_NODE_ID"))
        dn_node = number(row.get("DN_NODE_ID"))

        if year is not None:
            year_min = min(year_min, year)
            year_max = max(year_max, year)
        if width is not None:
            width_min = min(width_min, width)
            width_max = max(width_max, width)
        if height is not None:
            height_min = min(height_min, height)
            height_max = max(height_max, height)
        if length is not None:
            length_min = min(length_min, length)
            length_max = max(length_max, length)
            total_length += float(length)
        if created:
            created_min = created if created_min is None or created < created_min else created_min
            created_max = created if created_max is None or created > created_max else created_max
        if modified:
            modified_min = modified if modified_min is None or modified < modified_min else modified_min
            modified_max = modified if modified_max is None or modified > modified_max else modified_max

        for lon, lat in coords:
            lon = float(lon)
            lat = float(lat)
            if lon < min_lon:
                min_lon = lon
            if lon > max_lon:
                max_lon = lon
            if lat < min_lat:
                min_lat = lat
            if lat > max_lat:
                max_lat = lat

        out_rows.append(
            [
                oid,
                int(row["DRAINAGE_ID"]),
                cat("subtype"),
                cat("maintenance"),
                cat("watershed"),
                cat("material"),
                cat("shape"),
                width,
                height,
                length,
                year,
                built,
                created,
                modified,
                up_node,
                dn_node,
                cat("upNodeType"),
                cat("dnNodeType"),
                cat("locSource"),
                cat("dimSource"),
                comments,
                encode_geometry(coords),
            ]
        )

    if missing_geometry:
        raise ValueError(f"{missing_geometry} CSV rows had no matching GeoJSON geometry")
    if len(out_rows) != len(rows):
        raise ValueError("Output row count does not match input row count")

    with META_PATH.open("r", encoding="utf-8") as f:
        source_meta = json.load(f)

    meta = {
        "count": len(out_rows),
        "uniqueIds": len({r[1] for r in out_rows}),
        "totalLengthFt": round(total_length, 2),
        "totalLengthMiles": round(total_length / 5280.0, 3),
        "meanLengthFt": round(total_length / len(out_rows), 2),
        "minLengthFt": round(length_min, 2),
        "maxLengthFt": round(length_max, 2),
        "yearMin": int(year_min),
        "yearMax": int(year_max),
        "widthMin": int(width_min) if float(width_min).is_integer() else round(width_min, 1),
        "widthMax": int(width_max) if float(width_max).is_integer() else round(width_max, 1),
        "heightMin": int(height_min) if float(height_min).is_integer() else round(height_min, 1),
        "heightMax": int(height_max) if float(height_max).is_integer() else round(height_max, 1),
        "createdMin": created_min,
        "createdMax": created_max,
        "modifiedMin": modified_min,
        "modifiedMax": modified_max,
        "bounds": [round(min_lat, 6), round(min_lon, 6), round(max_lat, 6), round(max_lon, 6)],
        "pulledAtLocal": source_meta.get("pulled_at_local"),
        "pulledAtUtc": source_meta.get("pulled_at_utc"),
        "sourcePage": cfg["source_page"],
        "serviceUrl": cfg["source_url"],
        "layerUrl": cfg["source_url"],
        "layerName": cfg["title"],
    }

    # Row layout documented for the app:
    # 0 oid, 1 id, 2 subtype, 3 maintenance, 4 watershed, 5 material, 6 shape,
    # 7 width, 8 height, 9 length, 10 year, 11 dateBuilt, 12 created,
    # 13 modified, 14 upNode, 15 dnNode, 16 upNodeType, 17 dnNodeType,
    # 18 locSource, 19 dimSource, 20 comments, 21 encoded geometry
    payload = {
        "meta": meta,
        "dict": dicts,
        "rows": out_rows,
    }
    data_json = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    # Keep the inline script safe if a comment happens to contain </script> or <!--.
    data_json = data_json.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    data_js = "const PIPE_DATA = " + data_json + ";\n"

    DATA_JS_PATH.write_text(data_js, encoding="utf-8")
    print(f"Wrote {DATA_JS_PATH.name} ({DATA_JS_PATH.stat().st_size / 1e6:.2f} MB)")

    if not TEMPLATE_PATH.exists() or not all(path.exists() for path in APP_PARTS):
        print("Template or app parts missing; data.js written, HTML not assembled.")
        return 0

    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    app_js = "\n\n".join(path.read_text(encoding="utf-8") for path in APP_PARTS)
    APP_JS_PATH.write_text(app_js, encoding="utf-8")
    print(f"Wrote {APP_JS_PATH.name} ({APP_JS_PATH.stat().st_size / 1e6:.2f} MB)")
    if "/*__PIPE_DATA__*/" not in template:
        raise ValueError("template.html is missing the /*__PIPE_DATA__*/ placeholder")
    if "/*__APP_JS__*/" not in template:
        raise ValueError("template.html is missing the /*__APP_JS__*/ placeholder")

    # Replace title and subtitle in template
    html = template.replace(
        "<h1>Austin Private Drainage Pipes</h1>",
        f"<h1>{cfg['title']}</h1>",
    )
    html = html.replace(
        "<p>FloodPro layer 8 · interactive explorer</p>",
        f"<p>{cfg['subtitle']}</p>",
    )
    html = html.replace("/*__PIPE_DATA__*/", data_js)
    html = html.replace("/*__APP_JS__*/", app_js)
    OUTPUT_PATH.write_text(html, encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH.name} ({OUTPUT_PATH.stat().st_size / 1e6:.2f} MB)")
    print(f"  {meta['count']:,} segments · {meta['totalLengthMiles']:,.2f} miles · {meta['yearMin']}–{meta['yearMax']}")
    return 0

'''

    content = content[:idx] + build_dataset_func + content[idx:]
    with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'w') as f:
        f.write(content)
    print("build_dataset function inserted successfully")
