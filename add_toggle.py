with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\template.html', 'r', encoding='utf-8') as f:
    content = f.read()

old = '  <a class="source-link" href="https://maps.austintexas.gov/floodpro/" target="_blank" rel="noopener">Source ↗</a>\n</header>'
new = '  <a class="source-link" href="https://maps.austintexas.gov/floodpro/" target="_blank" rel="noopener">Source ↗</a>\n  <a class="header-link" id="toggleSource" href="Austin_ArcGIS_Drainage_Pipes_Explorer.html" title="Switch to ArcGIS coverage">⇄ ArcGIS</a>\n</header>'

if old in content:
    content = content.replace(old, new)
    with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\template.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Template updated successfully')
else:
    print('Could not find old string')
    # Debug: show what's around the source-link
    import re
    idx = content.find('source-link')
    if idx >= 0:
        print('Found at', idx)
        print(repr(content[idx-50:idx+200]))
