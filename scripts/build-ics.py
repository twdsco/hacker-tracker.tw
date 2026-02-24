#!/usr/bin/env python3
import json
from datetime import datetime, timezone
from pathlib import Path
import sys

root = Path(__file__).resolve().parent.parent
all_file = root / "data" / "all.json"
output_all = root / "data" / "allevents.ics"
output_confirmed = root / "data" / "confirmed.ics"
output_tentative = root / "data" / "tentative.ics"

if not all_file.exists():
    sys.exit(f"Missing all.json at {all_file}")

try:
    events = json.loads(all_file.read_text(encoding="utf-8"))
except json.JSONDecodeError as exc:
    sys.exit(f"Invalid JSON in all.json: {exc}")

if not isinstance(events, list):
    sys.exit("all.json must be a JSON array")


def parse_datetime(value: str) -> datetime:
    if "T" in value:
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            pass
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError as exc:
        raise ValueError(f"Invalid date/time: {value}") from exc


def format_dt(dt: datetime) -> str:
    if dt.tzinfo is None:
        return dt.strftime("%Y%m%dT%H%M%S")
    return dt.strftime("%Y%m%dT%H%M%S%z")


def build_calendar(items):
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//hacker-tracker.tw//events//TW",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]

    for ev in items:
        if not isinstance(ev, dict):
            continue
        title = str(ev.get("title", ""))
        start = str(ev.get("start", ""))
        end = str(ev.get("end", ""))
        location = str(ev.get("location", ""))
        organizer = str(ev.get("organizer", ""))
        contact = str(ev.get("contact", ""))
        url = str(ev.get("url", ""))

        if not title or not start or not end:
            continue

        try:
            dt_start = parse_datetime(start)
            dt_end = parse_datetime(end)
        except ValueError:
            continue

        dtstamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        uid = f"{abs(hash((title, start, end)))}@hacker-tracker.tw"

        description_parts = []
        if organizer:
            description_parts.append(f"Organizer: {organizer}")
        if contact:
            description_parts.append(f"Contact: {contact}")
        if url:
            description_parts.append(f"URL: {url}")
        description = "\\n".join(description_parts)

        lines.extend([
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTAMP:{dtstamp}",
            f"SUMMARY:{title}",
            f"DTSTART:{format_dt(dt_start)}",
            f"DTEND:{format_dt(dt_end)}",
        ])

        if location:
            lines.append(f"LOCATION:{location}")
        if description:
            lines.append(f"DESCRIPTION:{description}")
        if url:
            lines.append(f"URL:{url}")

        lines.append("END:VEVENT")

    lines.append("END:VCALENDAR")
    return "\n".join(lines) + "\n"


output_all.write_text(build_calendar(events), encoding="utf-8")
confirmed = [ev for ev in events if isinstance(ev, dict) and ev.get("status") == "confirmed"]
tentative = [ev for ev in events if isinstance(ev, dict) and ev.get("status") == "tentative"]
output_confirmed.write_text(build_calendar(confirmed), encoding="utf-8")
output_tentative.write_text(build_calendar(tentative), encoding="utf-8")

print(f"Wrote {output_all} with {len(events)} events")
print(f"Wrote {output_confirmed} with {len(confirmed)} events")
print(f"Wrote {output_tentative} with {len(tentative)} events")
