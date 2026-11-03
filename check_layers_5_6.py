import urllib.request, urllib.parse, json

SERVICE_URL = 'https://maps.austintexas.gov/arcgis/rest/services/FloodPro/Stormdrain_Infrastructure/MapServer'

for layer_id in [5, 6]:
    LAYER_URL = SERVICE_URL + '/' + str(layer_id)
    QUERY_URL = LAYER_URL + '/query'
    
    # Get metadata
    req = urllib.request.Request(LAYER_URL + '?f=pjson', headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=120) as resp:
        meta = json.loads(resp.read().decode())
    print('Layer ' + str(layer_id) + ': ' + str(meta.get('name')) + ' - ' + str(meta.get('geometryType')))
    
    # Get count
    data = urllib.request.urlopen(urllib.request.Request(
        QUERY_URL,
        data=urllib.parse.urlencode({'where': '1=1', 'returnCountOnly': 'true', 'f': 'json'}).encode(),
        headers={'User-Agent': 'Mozilla/5.0'}
    ), timeout=120)
    count = json.loads(data.read().decode())['count']
    print('  Feature count: ' + str(count) + ',')
    
    # Sample feature
    sample = urllib.request.urlopen(urllib.request.Request(
        QUERY_URL,
        data=urllib.parse.urlencode({'where': '1=1', 'outFields': '*', 'returnGeometry': 'true', 'outSR': '4326', 'resultRecordCount': '2', 'f': 'geojson'}).encode(),
        headers={'User-Agent': 'Mozilla/5.0'}
    ), timeout=120)
    sample_data = json.loads(sample.read().decode())
    for f in sample_data.get('features', []):
        props = f.get('properties', {})
        print('  Sample: OBJECTID=' + str(f['id']) + ', keys: ' + str(list(props.keys())[:10]))
    print()
