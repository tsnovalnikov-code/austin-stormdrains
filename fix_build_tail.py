with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'r') as f:
    content = f.read()

# Find and replace from "def main()" to end of file
marker = 'def main() -> int:'
idx = content.find(marker)
if idx == -1:
    print("ERROR: Could not find 'def main()'")
else:
    new_tail = '''def main() -> int:
    key = sys.argv[1] if len(sys.argv) > 1 else "floodpro"
    if key not in DATASETS:
        print(f"Unknown dataset: {key}. Choose from: {', '.join(DATASETS)}")
        return 1
    return build_dataset(key)


if __name__ == "__main__":
    raise SystemExit(main())'''

    content = content[:idx] + new_tail
    with open(r'C:\Users\Tim S\Downloads\the\floodpro_private_pipes\build\build_explorer.py', 'w') as f:
        f.write(content)
    print("Tail replaced successfully")
