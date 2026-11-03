with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'r') as f:
    lines = f.readlines()

# Find and fix the broken data_js line
for i, line in enumerate(lines):
    if 'data_js = ' in line and 'const PIPE_DATA' in line:
        print(f'Line {i}: {repr(line)}')
        # The line ends with ";\n" which is a literal newline inside the string
        # Replace it with proper escaped newline
        lines[i] = '    data_js = "const PIPE_DATA = " + data_json + ";\\n"\n'
        print(f'Fixed line {i}: {repr(lines[i])}')
        break

with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'w') as f:
    f.writelines(lines)
print('Done')
