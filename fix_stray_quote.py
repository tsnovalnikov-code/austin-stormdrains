with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'r') as f:
    lines = f.readlines()

# Remove the stray line 359 (index 358) which is just a quote
# Line 358 (index 357) is the data_js line, line 359 (index 358) is the stray "
if len(lines) > 358 and lines[358].strip() == '"':
    del lines[358]
    print('Removed stray quote line')

with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'w') as f:
    f.writelines(lines)
print('Done')
