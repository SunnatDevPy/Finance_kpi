"""Local disk storage for user-uploaded images (client logos, etc.)."""

import uuid
from pathlib import Path

from app.config import settings

CLIENT_LOGO_SUBDIR = "client_logos"
MAX_LOGO_BYTES = 5 * 1024 * 1024

ALLOWED_LOGO_CONTENT_TYPES: dict[str, str] = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/svg+xml": "svg",
}


def _client_logo_dir() -> Path:
    path = Path(settings.upload_dir) / CLIENT_LOGO_SUBDIR
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_client_logo(client_id: int, content_type: str, content: bytes) -> str:
    """Writes the logo to disk and returns the stored filename."""
    ext = ALLOWED_LOGO_CONTENT_TYPES[content_type]
    filename = f"client_{client_id}_{uuid.uuid4().hex[:10]}.{ext}"
    (_client_logo_dir() / filename).write_bytes(content)
    return filename


def delete_client_logo(filename: str | None) -> None:
    if not filename:
        return
    path = _client_logo_dir() / filename
    path.unlink(missing_ok=True)
