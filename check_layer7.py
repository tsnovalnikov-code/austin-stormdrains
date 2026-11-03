import urllib.request, urllib.parse, json

SERVICE_URL = 'https://maps.austintexas.gov/arcgis/rest/services/FloodPro/Stormdrain_Infrastructure/MapServer'
LAYER_ID = 7
LAYER_URL = f'{SERVICE_URL}/{LAYER_ID}'
QUERY_URL = f'{LAYER_URL}/query'

# Get layer metadata
req = urllib.request.Request(f'{LAYER_URL}?f=pjson', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=120) as resp:
    meta = json.loads(resp.read().decode())
print('Layer name:', meta.get('name'))
print('Geometry type:', meta.get('geometryType'))
print('Description:', meta.get('description'))
print('Fields:')
for f in meta.get('fields', []):
    print('  ' + f['name'] + ' (' + f['type'] + ')')
print()

# Get count
data = urllib.request.urlopen(urllib.request.Request(
    QUERY_URL,
    data=urllib.parse.urlencode({'where': '1=1', 'returnCountOnly': 'true', 'f': 'json'}).encode(),
    headers={'User-Agent': 'Mozilla/5.0'}
), timeout=120)
count = json.loads(data.read().decode())['count']
print('Feature count:', count)
