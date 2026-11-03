with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'r') as f:
    content = f.read()

# Fix the length field to handle both SHAPE_LEN_ft and Shape__Length/SHAPE.LEN
old = '        length = number(row.get("SHAPE_LEN_ft"))'
new = '''        length = number(row.get("SHAPE_LEN_ft"))
        if length is None:
            length = number(row.get("Shape__Length"))
        if length is None:
            length = number(row.get("SHAPE.LEN"))'''

if old in content:
    content = content.replace(old, new)
    print('Fixed length field')
else:
    print('Could not find old length line')

with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'w') as f:
    f.write(content)
