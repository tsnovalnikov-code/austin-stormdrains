with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\template.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add header/manhole checkboxes after quick-chips
old_quick = '''    <div class="quick-chips">
      <button class="quick-chip" data-quick="pre1970" type="button">Built before 1970</button>
      <button class="quick-chip" data-quick="since2010" type="button">Built 2010+</button>
      <button class="quick-chip" data-quick="wide36" type="button">Width ≥ 36"</button>
      <button class="quick-chip" data-quick="long200" type="button">Length ≥ 200 ft</button>
      <button class="quick-chip" data-quick="culvert" type="button">Culverts</button>
      <button class="quick-chip" data-quick="txdot" type="button">TxDOT</button>
    </div>'''

new_quick = '''    <div class="quick-chips">
      <button class="quick-chip" data-quick="pre1970" type="button">Built before 1970</button>
      <button class="quick-chip" data-quick="since2010" type="button">Built 2010+</button>
      <button class="quick-chip" data-quick="wide36" type="button">Width ≥ 36"</button>
      <button class="quick-chip" data-quick="long200" type="button">Length ≥ 200 ft</button>
      <button class="quick-chip" data-quick="culvert" type="button">Culverts</button>
      <button class="quick-chip" data-quick="txdot" type="button">TxDOT</button>
    </div>
    <div class="field-stack" style="padding: 0 16px 12px;">
      <label class="check"><input type="checkbox" id="showHeaders" checked> Show headers</label>
      <label class="check"><input type="checkbox" id="showManholes" checked> Show manholes</label>
    </div>'''

if old_quick in content:
    content = content.replace(old_quick, new_quick)
    print('Template updated with header/manhole checkboxes')
else:
    print('Could not find quick-chips block')

with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\template.html', 'w', encoding='utf-8') as f:
    f.write(content)
