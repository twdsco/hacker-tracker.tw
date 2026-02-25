#!/usr/bin/env python3
import json
from pathlib import Path
import sys
from datetime import datetime, timezone, timedelta

root = Path(__file__).resolve().parent.parent
output_file = root / "data" / "all.json"

merged = []
for event_file in sorted((root / "data" / "original").glob("*.json")):
    if not event_file.exists():
        print(f"Warning: missing event file: {event_file}. Skip.", file=sys.stderr)
        continue
    payload = json.loads(event_file.read_text(encoding="utf-8"))
    items = payload if isinstance(payload, list) else [payload]
    for event in items:
        if not isinstance(event, dict):
            print(f"Warning: Event file must contain JSON object(s): {event_file}. Skip.", file=sys.stderr)
            continue
        merged.append(event)

output_file.write_text(json.dumps(merged, ensure_ascii=False, indent=4) + "\n", encoding="utf-8")
print(f"Wrote {output_file} with {len(merged)} events")
