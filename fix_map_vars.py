with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\app-20-map.js', 'r') as f:
    content = f.read()

old = 'let basemapLayer = null;\nlet osmLayer = null;\nlet lightLayer = null;'
new = 'let basemapLayer = null;\nlet satelliteLayer = null;\nlet streetLayer = null;\nlet headerMarkers = null;\nlet manholeMarkers = null;'

if old in content:
    content = content.replace(old, new)
    print('Variable declarations updated')
else:
    print('Could not find old variable declarations')
    # Debug
    for i, line in enumerate(content.split('\n')[:10]):
        print(f'{i}: {repr(line)}')

with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\app-20-map.js', 'w') as f:
    f.write(content)
