#!/usr/bin/env python3
import json
from pathlib import Path
import os
import sys

root = Path.cwd()
index_file = root / "data" / "index.json"

created_env = os.environ.get("CREATED", "")
created = [line.strip() for line in created_env.splitlines() if line.strip()]
created_rel = {str(Path(p).relative_to(root / "data")) for p in created}

current = []
if index_file.exists():
    current = json.loads(index_file.read_text(encoding="utf-8"))
    if not isinstance(current, list):
        sys.exit("index.json must be a JSON array of filenames")

existing = set()
for rel in current:
    if not isinstance(rel, str):
        continue
    if (root / "data" / rel).exists():
        existing.add(rel)

for rel in created_rel:
    existing.add(rel)

files = sorted(existing)
index_file.write_text(json.dumps(files, ensure_ascii=False, indent=4) + "\n", encoding="utf-8")
print(f"index.json updated with {len(files)} files")
