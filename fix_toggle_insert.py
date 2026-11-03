with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'r') as f:
    lines = f.readlines()

# Find line with __PIPE_DATA__
for i, line in enumerate(lines):
    if '__PIPE_DATA__' in line:
        print(f'Line {i+1}: {repr(line)}')
        # Insert toggle replacement before this line
        indent = '    '
        toggle_lines = [
            indent + '# Replace the data source toggle link\n',
            indent + 'html = html.replace(\n',
            indent + "    " + "'href=\"Austin_ArcGIS_Drainage_Pipes_Explorer.html\" title=\"Switch to ArcGIS coverage\">SWITCH_ARROW ArcGIS',\n",
            indent + "    " + "f'href=\"{cfg[\"other_output\"]}\" title=\"Switch to {cfg[\"other_title\"]}\">SWITCH_ARROW {cfg[\"other_label\"]}',\n",
            indent + ')\n',
        ]
        lines[i:i] = toggle_lines
        break

with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'w') as f:
    f.writelines(lines)
print('Done')
