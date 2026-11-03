with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'r') as f:
    content = f.read()

# Remove the misplaced toggle block (lines 374-380 approximately)
old_block = '''    # Replace the data source toggle link
    html = html.replace(
        'href="Austin_ArcGIS_Drainage_Pipes_Explorer.html" title="Switch to ArcGIS coverage">SWITCH_ARROW ArcGIS',
        f'href="{cfg["other_output"]}" title="Switch to {cfg["other_title"]}">SWITCH_ARROW {cfg["other_label"]}',
    )
    if "/*__PIPE_DATA__*/" not in template:'''

new_block = '''    if "/*__PIPE_DATA__*/" not in template:'''

if old_block in content:
    content = content.replace(old_block, new_block)
    print('Removed misplaced toggle block')
else:
    print('Could not find misplaced block')

# Now add the toggle replacement after html is created (after the subtitle replacement)
old_subtitle = '''    html = html.replace(
        "<p>FloodPro layer 8 - interactive explorer</p>",
        f"<p>{cfg['subtitle']}</p>",
    )
    html = html.replace("/*__PIPE_DATA__*/", data_js)'''

new_subtitle = '''    html = html.replace(
        "<p>FloodPro layer 8 - interactive explorer</p>",
        f"<p>{cfg['subtitle']}</p>",
    )
    # Replace the data source toggle link
    html = html.replace(
        'href="Austin_ArcGIS_Drainage_Pipes_Explorer.html" title="Switch to ArcGIS coverage">⇄ ArcGIS',
        f'href="{cfg["other_output"]}" title="Switch to {cfg["other_title"]}">⇄ {cfg["other_label"]}',
    )
    html = html.replace("/*__PIPE_DATA__*/", data_js)'''

if old_subtitle in content:
    content = content.replace(old_subtitle, new_subtitle)
    print('Added toggle replacement after subtitle')
else:
    print('Could not find subtitle block')

with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'w') as f:
    f.write(content)
