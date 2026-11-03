with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'r') as f:
    content = f.read()

# Fix the broken string literal
content = content.replace(
    'data_js = "const PIPE_DATA = " + data_json + ";\n"',
    'data_js = "const PIPE_DATA = " + data_json + ";\\n"'
)

with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'w') as f:
    f.write(content)
print('Fixed string literal')
