with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\Austin_ArcGIS_Drainage_Pipes_Explorer.html', 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('toggleSource')
if idx >= 0:
    snippet = content[idx:idx+200]
    with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\toggle_check.txt', 'a', encoding='utf-8') as out:
        out.write('ArcGIS toggle found at ' + str(idx) + '\n')
        out.write(repr(snippet[:150]) + '\n')
else:
    with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\toggle_check.txt', 'a', encoding='utf-8') as out:
        out.write('toggleSource not found in ArcGIS HTML\n')

print('Done')
