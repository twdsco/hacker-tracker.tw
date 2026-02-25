#!/usr/bin/env python3
import json
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT_DIR = Path(__file__).resolve().parent.parent
TAGS_FILE = ROOT_DIR / "data" / "tags.json"
if not TAGS_FILE.exists():
    print(f"Error: Missing tags.json at {TAGS_FILE}", file=sys.stderr)
    sys.exit(1)
try:
    _tags_data = json.loads(TAGS_FILE.read_text(encoding="utf-8"))
except json.JSONDecodeError as exc:
    print(f"Error: Invalid tags.json: {exc}", file=sys.stderr)
    sys.exit(1)
if not isinstance(_tags_data, list):
    print("Error: tags.json must be a JSON array", file=sys.stderr)
    sys.exit(1)
SUPPORTED_TAGS = {tag for tag in _tags_data if isinstance(tag, str)}

REQUIRED_TAGS = {"實體", "線上"}
ALLOWED_STATUS = {"confirmed", "tentative"}
REQUIRED_FIELDS = {
    "title",
    "start",
    "end",
    "status",
    "organizer",
    "tags",
}


def is_http_url(value: object) -> tuple[bool, str]:
    if not isinstance(value, str):
        return False, "must be a string"
    parsed = urlparse(value)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return False, "must be a valid http or https URL"
    return True, ""


def is_http_url_or_empty(value: object) -> tuple[bool, str]:
    if value in (None, ""):
        return True, ""
    return is_http_url(value)


def is_datetime_string(value: object) -> tuple[bool, str]:
    if not isinstance(value, str):
        return False, "must be a string"
    if "T" in value:
        try:
            dt = datetime.fromisoformat(value)
        except ValueError:
            return False, "must be a valid ISO datetime"
        if dt.tzinfo is None:
            return False, "must include timezone offset when time is present"
        return True, ""
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return False, "must be YYYY-MM-DD or ISO datetime with timezone"
    return True, ""


def is_status(value: object) -> tuple[bool, str]:
    if not isinstance(value, str):
        return False, "must be a string"
    if value not in ALLOWED_STATUS:
        return False, "must be one of: confirmed, tentative"
    return True, ""


def is_tags(value: object) -> tuple[bool, str]:
    if not isinstance(value, list):
        return False, "must be an array"
    for tag in value:
        if not isinstance(tag, str):
            return False, "each tag must be a string"
        if tag not in SUPPORTED_TAGS:
            return False, f"unsupported tag: {tag}"
    if not any(tag in REQUIRED_TAGS for tag in value if isinstance(tag, str)):
        return False, "must include at least one of: 實體, 線上"
    return True, ""


FIELDS_TYPE = {
    "title": str,
    "start": is_datetime_string,
    "end": is_datetime_string,
    "status": is_status,
    "organizer": str,
    "tags": is_tags,
    "location": str,
    "contact": str,
    "url": is_http_url_or_empty,
}


def add_error(message: str) -> None:
    print(f"Error: {message}", file=sys.stderr)


def main() -> None:
    if len(sys.argv) != 2:
        add_error("Usage: scripts/validate-event.py <event-file>")
        sys.exit(1)

    event_path = Path(sys.argv[1])
    if not event_path.exists():
        add_error(f"File not found: {event_path}")
        sys.exit(1)

    try:
        data = json.loads(event_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        add_error(f"Invalid JSON: {exc}")
        sys.exit(1)

    if not isinstance(data, (dict, list)):
        add_error("Event file must contain a JSON object or an array of objects")
        sys.exit(1)

    items = data if isinstance(data, list) else [data]

    has_error = False
    for idx, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            add_error(f"Event at index {idx} must be a JSON object")
            has_error = True
            continue

        for field in REQUIRED_FIELDS:
            if field not in item:
                add_error(f"Missing required field: {field} (event {idx})")
                has_error = True

        for field, expected_type in FIELDS_TYPE.items():
            if field not in item:
                continue
            value = item[field]
            if isinstance(expected_type, type):
                if not isinstance(value, expected_type):
                    add_error(f"Field '{field}' must be of type {expected_type.__name__} (event {idx})")
                    has_error = True
            elif callable(expected_type):
                ok, msg = expected_type(value)
                if not ok:
                    detail = f": {msg}" if msg else ""
                    add_error(f"Field '{field}' failed custom validation{detail} (event {idx})")
                    has_error = True
            else:
                add_error(f"Invalid validator for field '{field}' (event {idx})")
                has_error = True

        # status and tags are validated by custom validators

    if has_error:
        sys.exit(1)
    print(f"OK: {event_path}")


if __name__ == "__main__":
    main()
