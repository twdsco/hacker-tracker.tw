#!/usr/bin/env python3
import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parent.parent
index_file = root / "data" / "index.json"
output_file = root / "data" / "all.json"

if not index_file.exists():
    sys.exit(f"Missing index.json at {index_file}")

index = json.loads(index_file.read_text(encoding="utf-8"))
if not isinstance(index, list):
    sys.exit("index.json must be a JSON array of filenames")

merged = []
for rel in index:
    if not isinstance(rel, str):
        sys.exit("index.json entries must be strings")
    event_file = root / "data" / rel
    if not event_file.exists():
        print(f"Warning: missing event file: {event_file}", file=sys.stderr)
        continue
    event = json.loads(event_file.read_text(encoding="utf-8"))
    if not isinstance(event, dict):
        sys.exit(f"Event file must contain a JSON object: {event_file}")
    merged.append(event)

output_file.write_text(json.dumps(merged, ensure_ascii=False, indent=4) + "\n", encoding="utf-8")
print(f"Wrote {output_file} with {len(merged)} events")
