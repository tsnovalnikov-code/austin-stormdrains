with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'r') as f:
    lines = f.readlines()

# Fix lines 368-370 (indices 367-369)
# Line 368: '    app_js = "\n'
# Line 369: '\n'
# Line 370: '".join(path.read_text(encoding="utf-8") for path in APP_PARTS)\n'
# Replace with: '    app_js = "\\n\\n".join(path.read_text(encoding="utf-8") for path in APP_PARTS)\n'

if len(lines) > 370:
    lines[367] = '    app_js = "\\n\\n".join(path.read_text(encoding="utf-8") for path in APP_PARTS)\n'
    del lines[368]  # Remove the empty line
    del lines[368]  # Remove the old ".join line (now shifted)
    print('Fixed app_js lines')

with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'w') as f:
    f.writelines(lines)
