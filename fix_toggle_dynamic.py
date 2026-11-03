with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'r') as f:
    content = f.read()

# Add toggle link replacement after the subtitle replacement
old = '''    html = html.replace(
        "<p>FloodPro layer 8 · interactive explorer</p>",
        f"<p>{cfg['subtitle']}</p>",
    )
    html = html.replace("/*__PIPE_DATA__*/", data_js)'''

new = '''    html = html.replace(
        "<p>FloodPro layer 8 · interactive explorer</p>",
        f"<p>{cfg['subtitle']}</p>",
    )
    # Replace the data source toggle link
    html = html.replace(
        'href="Austin_ArcGIS_Drainage_Pipes_Explorer.html" title="Switch to ArcGIS coverage">⇄ ArcGIS',
        f'href="{cfg["other_output"]}" title="Switch to {cfg["other_title"]}">⇄ {cfg["other_label"]}',
    )
    html = html.replace("/*__PIPE_DATA__*/", data_js)'''

if old in content:
    content = content.replace(old, new)
    with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'w') as f:
        f.write(content)
    print('Build script updated for dynamic toggle')
else:
    print('Could not find old string')
