with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'rb') as f:
    content = f.read()

# Replace all remaining non-ASCII bytes
content = content.replace(b'\xb7', b'-')
content = content.replace(b'\x96', b'-')

with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'wb') as f:
    f.write(content)

# Verify no non-ASCII bytes remain
count = sum(1 for b in content if b > 127)
print(f'Remaining non-ASCII bytes: {count}')
