with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'r') as f:
    content = f.read()

idx = content.find('FloodPro layer 8')
if idx >= 0:
    print('Found at', idx)
    print(repr(content[idx-100:idx+300]))
else:
    print('NOT found')
