with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\pull_arcgis_drainage_pipes.py', 'r') as f:
    content = f.read()
content = content.replace('timeout=120', 'timeout=300')
with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\pull_arcgis_drainage_pipes.py', 'w') as f:
    f.write(content)
print('Done')
