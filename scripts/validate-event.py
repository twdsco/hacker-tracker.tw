#!/usr/bin/env python3
import json
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

REQUIRED_FIELDS = {
    "title": str,
    "start": str,
    "end": str,
    "status": str,
    "organizer": str,
    "tags": list,
}
REQUIRED_TAGS = {"實體", "線上"}
ALLOWED_STATUS = {"confirmed", "tentative"}


def fail(message: str) -> None:
    print(f"Error: {message}", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    if len(sys.argv) != 2:
        fail("Usage: scripts/validate-event.py <event-file>")

    event_path = Path(sys.argv[1])
    if not event_path.exists():
        fail(f"File not found: {event_path}")

    try:
        data = json.loads(event_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"Invalid JSON: {exc}")

    if not isinstance(data, dict):
        fail("Event file must contain a single JSON object")

    for field, expected_type in REQUIRED_FIELDS.items():
        if field not in data:
            fail(f"Missing required field: {field}")
        value = data[field]
        if not isinstance(value, expected_type):
            fail(f"Field '{field}' must be of type {expected_type.__name__}")

    if data["status"] not in ALLOWED_STATUS:
        fail("Status must be one of: confirmed, tentative")

    for optional in ("location", "contact"):
        if optional in data and data[optional] is not None and not isinstance(data[optional], str):
            fail(f"Field '{optional}' must be a string if provided")

    if "url" in data and data["url"] not in (None, ""):
        if not isinstance(data["url"], str):
            fail("Field 'url' must be a string if provided")
        parsed = urlparse(data["url"])
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            fail("Field 'url' must be a valid http or https URL")

    for field in ("start", "end"):
        value = data[field]
        if "T" in value:
            try:
                datetime.fromisoformat(value)
            except ValueError:
                fail(f"Field '{field}' must be a valid ISO datetime with timezone")
        else:
            try:
                datetime.strptime(value, "%Y-%m-%d")
            except ValueError:
                fail(f"Field '{field}' must be YYYY-MM-DD or ISO datetime with timezone")

    tags = data.get("tags", [])
    if not any(tag in REQUIRED_TAGS for tag in tags if isinstance(tag, str)):
        fail("Tags must include at least one of: 實體, 線上")

    print(f"OK: {event_path}")


if __name__ == "__main__":
    main()
