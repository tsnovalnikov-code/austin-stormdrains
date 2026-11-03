with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'r', encoding='utf-8') as f:
    content = f.read()

old = '''    # Replace the data source toggle link
    html = html.replace(
        'href="Austin_ArcGIS_Drainage_Pipes_Explorer.html" title="Switch to ArcGIS coverage">SWITCH_ARROW ArcGIS',
        f'href="{cfg["other_output"]}" title="Switch to {cfg["other_title"]}">SWITCH_ARROW {cfg["other_label"]}',
    )'''

new = '''    # Replace the data source toggle link
    html = html.replace(
        'href="Austin_ArcGIS_Drainage_Pipes_Explorer.html" title="Switch to ArcGIS coverage">\u21c4 ArcGIS',
        f'href="{cfg["other_output"]}" title="Switch to {cfg["other_title"]}">\u21c4 {cfg["other_label"]}',
    )'''

if old in content:
    content = content.replace(old, new)
    with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Build script updated for dynamic toggle')
else:
    print('Could not find old string')
    idx = content.find('SWITCH_ARROW')
    if idx >= 0:
        print(repr(content[idx-100:idx+200]))
