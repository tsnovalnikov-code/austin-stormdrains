with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add header/manhole loading after the pipe geojson loading
old_load = '''    print(f"Reading {GEOJSON_PATH.name} ...")
    with GEOJSON_PATH.open("r", encoding="utf-8") as f:
        geojson = json.load(f)
    features = geojson.get("features", [])
    print(f"  {len(features):,} geometry features")

    geom_by_oid: dict[int, list[list[float]]] = {}'''

new_load = '''    print(f"Reading {GEOJSON_PATH.name} ...")
    with GEOJSON_PATH.open("r", encoding="utf-8") as f:
        geojson = json.load(f)
    features = geojson.get("features", [])
    print(f"  {len(features):,} geometry features")

    # Load point features (headers and manholes)
    header_features: list[dict] = []
    manhole_features: list[dict] = []
    headers_path = cfg.get("headers_geojson")
    manholes_path = cfg.get("manholes_geojson")
    if headers_path and headers_path.exists():
        with headers_path.open("r", encoding="utf-8") as f:
            headers_geojson = json.load(f)
        header_features = headers_geojson.get("features", [])
        print(f"  {len(header_features):,} header points")
    if manholes_path and manholes_path.exists():
        with manholes_path.open("r", encoding="utf-8") as f:
            manholes_geojson = json.load(f)
        manhole_features = manholes_geojson.get("features", [])
        print(f"  {len(manhole_features):,} manhole points")

    geom_by_oid: dict[int, list[list[float]]] = {}'''

if old_load in content:
    content = content.replace(old_load, new_load)
    print('Point loading added')
else:
    print('Could not find old load block')

# Update the payload to include point features
old_payload = '''    payload = {
        "meta": meta,
        "dict": dicts,
        "rows": out_rows,
    }'''

new_payload = '''    payload = {
        "meta": meta,
        "dict": dicts,
        "rows": out_rows,
        "headers": header_features,
        "manholes": manhole_features,
    }'''

if old_payload in content:
    content = content.replace(old_payload, new_payload)
    print('Payload updated with points')
else:
    print('Could not find old payload')

# Update meta to include point counts
old_meta_end = '''        "layerUrl": cfg["source_url"],
        "layerName": cfg["title"],
    }'''

new_meta_end = '''        "layerUrl": cfg["source_url"],
        "layerName": cfg["title"],
        "headerCount": len(header_features),
        "manholeCount": len(manhole_features),
    }'''

if old_meta_end in content:
    content = content.replace(old_meta_end, new_meta_end)
    print('Meta updated with point counts')
else:
    print('Could not find old meta end')

with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
