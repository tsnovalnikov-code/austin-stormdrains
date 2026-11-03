with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'r') as f:
    content = f.read()

# Fix the broken app_js line
old = '    app_js = "\n\n".join(path.read_text(encoding="utf-8") for path in APP_PARTS)'
new = '    app_js = "\\n\\n".join(path.read_text(encoding="utf-8") for path in APP_PARTS)'

if old in content:
    content = content.replace(old, new)
    print('Fixed app_js line')
else:
    print('Could not find old app_js line')
    # Show what's there
    import re
    for i, line in enumerate(content.split('\n')):
        if 'app_js' in line:
            print(f'Line {i}: {repr(line)}')

with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'w') as f:
    f.write(content)
