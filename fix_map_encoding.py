with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\app-20-map.js', 'rb') as f:
    content = f.read()

# Find non-UTF-8 bytes
for i, b in enumerate(content):
    if b > 127:
        start = max(0, i-30)
        end = min(len(content), i+30)
        print(f'Position {i}: byte {hex(b)}')
        print(f'Context: {content[start:end]}')
        print()

# Replace all non-ASCII bytes with safe equivalents
content = content.replace(b'\x97', b'-')  # em-dash variant
content = content.replace(b'\x9d', b'"')  # quote variant

with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\app-20-map.js', 'wb') as f:
    f.write(content)

# Verify
count = sum(1 for b in content if b > 127)
print(f'Remaining non-ASCII bytes: {count}')
