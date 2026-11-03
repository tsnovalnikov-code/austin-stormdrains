with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\merge_floodpro_layers.py', 'r') as f:
    content = f.read()

content = content.replace(
    '"OBSERVATION": int(row["OBSERVATION"]) if row.get("OBSERVATION") else None,',
    '"OBSERVATION": row.get("OBSERVATION") or None,'
)

with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\merge_floodpro_layers.py', 'w') as f:
    f.write(content)
print('Done')
