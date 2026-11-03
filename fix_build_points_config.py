with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add header/manhole paths to DATASETS config
old_config = '''    "floodpro": {
        "csv": ROOT / "Austin_FloodPro_Drainage_Pipes.csv",
        "geojson": ROOT / "Austin_FloodPro_Drainage_Pipes.geojson",
        "meta": ROOT / "metadata_floodpro_merged.json",
        "output": ROOT / "Austin_FloodPro_Drainage_Pipes_Explorer.html",
        "title": "Austin FloodPro Drainage Pipes",
        "subtitle": "FloodPro layers 7+8 - interactive explorer",
        "source_page": "https://maps.austintexas.gov/floodpro/",
        "source_label": "FloodPro",
        "source_url": "https://maps.austintexas.gov/arcgis/rest/services/FloodPro/Stormdrain_Infrastructure/MapServer",
        "other_dataset": "arcgis",
        "other_label": "ArcGIS",
        "other_title": "Austin ArcGIS Drainage Pipes",
        "other_output": "Austin_ArcGIS_Drainage_Pipes_Explorer.html",
    },'''

new_config = '''    "floodpro": {
        "csv": ROOT / "Austin_FloodPro_Drainage_Pipes.csv",
        "geojson": ROOT / "Austin_FloodPro_Drainage_Pipes.geojson",
        "meta": ROOT / "metadata_floodpro_merged.json",
        "headers_geojson": ROOT / "Austin_FloodPro_Headers.geojson",
        "manholes_geojson": ROOT / "Austin_FloodPro_Manholes.geojson",
        "output": ROOT / "Austin_FloodPro_Drainage_Pipes_Explorer.html",
        "title": "Austin FloodPro Drainage Pipes",
        "subtitle": "FloodPro layers 5-8 - interactive explorer",
        "source_page": "https://maps.austintexas.gov/floodpro/",
        "source_label": "FloodPro",
        "source_url": "https://maps.austintexas.gov/arcgis/rest/services/FloodPro/Stormdrain_Infrastructure/MapServer",
        "other_dataset": "arcgis",
        "other_label": "ArcGIS",
        "other_title": "Austin ArcGIS Drainage Pipes",
        "other_output": "Austin_ArcGIS_Drainage_Pipes_Explorer.html",
    },'''

if old_config in content:
    content = content.replace(old_config, new_config)
    print('Config updated')
else:
    print('Could not find old config')

with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'w', encoding='utf-8') as f:
    f.write(content)
