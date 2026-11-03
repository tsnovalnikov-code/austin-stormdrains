with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'r') as f:
    lines = f.readlines()

# Line 389 (index 388) is: '    html = html.replace("/*__PIPE_DATA__*/", data_js)\n'
# Replace it with the toggle link replacement + the PIPE_DATA replacement
new_lines = []
for i, line in enumerate(lines):
    if i == 388:  # Line 389
        new_lines.append('    # Replace the data source toggle link\n')
        new_lines.append('    html = html.replace(\n')
        new_lines.append('        \'href="Austin_ArcGIS_Drainage_Pipes_Explorer.html" title="Switch to ArcGIS coverage">⇄ ArcGIS\',\n')
        new_lines.append(f'        f\'href="{cfg["other_output"]}" title="Switch to {cfg["other_title"]}">⇄ {cfg["other_label"]}\',\n')
        new_lines.append('    )\n')
        new_lines.append(line)  # Keep the original PIPE_DATA replacement
    else:
        new_lines.append(line)

with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'w') as f:
    f.writelines(new_lines)
print('Build script updated for dynamic toggle')
