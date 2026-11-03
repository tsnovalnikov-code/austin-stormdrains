with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'rb') as f:
    content = f.read()

# Replace the middle dot with a regular hyphen
content = content.replace(b'\xb7', b'-')

with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'wb') as f:
    f.write(content)
print('Fixed encoding')
