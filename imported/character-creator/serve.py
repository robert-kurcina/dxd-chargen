#!/usr/bin/env python3
"""Serve the character creator and persist validated character JSON updates."""

from __future__ import annotations

import argparse
import json
import os
import re
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent / "creator"
DATA = ROOT / "data"
PORTRAITS = ROOT / "portraits"
CHARACTER_PATH = re.compile(r"^/api/characters/([a-z0-9][a-z0-9-]*)$")
MAX_BODY_BYTES = 1_000_000


class CharacterCreatorHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_json(self, payload: object, status: HTTPStatus = HTTPStatus.OK) -> None:
        response = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def do_GET(self) -> None:
        if urlparse(self.path).path != "/api/characters":
            super().do_GET()
            return

        characters = []
        for source in DATA.glob("*.json"):
            try:
                payload = json.loads(source.read_text(encoding="utf-8"))
                name = str(payload.get("Name", "")).splitlines()[0].strip()
            except (OSError, json.JSONDecodeError, AttributeError):
                continue
            portrait = next(
                (
                    PORTRAITS / f"decal-{source.stem}{suffix}"
                    for suffix in (".png", ".jpg", ".jpeg", ".webp")
                    if (PORTRAITS / f"decal-{source.stem}{suffix}").is_file()
                ),
                None,
            )
            characters.append({
                "slug": source.stem,
                "name": name or source.stem,
                "portrait": portrait.relative_to(ROOT).as_posix() if portrait else None,
            })

        characters.sort(key=lambda character: character["name"].casefold())
        self.send_json({"characters": characters})

    def do_PUT(self) -> None:
        match = CHARACTER_PATH.fullmatch(urlparse(self.path).path)
        if match is None:
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > MAX_BODY_BYTES:
            self.send_error(HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
            return

        try:
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict) or not str(payload.get("Name", "")).strip():
                raise ValueError("character data must be an object with a populated Name")
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError) as error:
            self.send_error(HTTPStatus.BAD_REQUEST, str(error))
            return

        destination = DATA / f"{match.group(1)}.json"
        temporary = destination.with_suffix(".json.tmp")
        DATA.mkdir(parents=True, exist_ok=True)
        temporary.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
        os.replace(temporary, destination)

        self.send_json({"saved": destination.name})


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), CharacterCreatorHandler)
    print(f"Character creator running at http://localhost:{args.port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
