with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'rb') as f:
    content = f.read()

# Find all non-ASCII bytes
for i, b in enumerate(content):
    if b > 127:
        start = max(0, i-30)
        end = min(len(content), i+30)
        print(f'Position {i}: byte {hex(b)}')
        print(f'Context: {content[start:end]}')
        print()

# Replace all 0xb7 with '-'
content = content.replace(b'\xb7', b'-')

with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'wb') as f:
    f.write(content)
print('Replaced all 0xb7 bytes')
