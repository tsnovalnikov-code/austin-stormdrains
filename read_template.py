with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\template.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines[576:580], start=577):
    print(f'{i}: {repr(line)}')
