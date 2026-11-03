with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\template.html', 'r', encoding='utf-8') as f:
    content = f.read()

old = '''          <select id="basemap">
            <option value="osm">OSM</option>
            <option value="light">Light</option>
          </select>'''

new = '''          <select id="basemap">
            <option value="satellite">Satellite</option>
            <option value="street">Street Map</option>
          </select>'''

if old in content:
    content = content.replace(old, new)
    with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\template.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Template updated')
else:
    print('Could not find old basemap select')
    idx = content.find('<select id="basemap">')
    if idx >= 0:
        print(repr(content[idx:idx+200]))
