"""Unicode (Cyrillic + Uzbek Latin) font registration for reportlab.

reportlab only ships Helvetica (no Cyrillic glyphs) and Bitstream Vera
(Latin only) by default, so every generated PDF falls back to DejaVu Sans
(bundled via the `fonts-dejavu-core` apt package in the backend Docker
image) when available. If the font file isn't present (e.g. running
outside Docker without the package installed) we silently fall back to
the built-in Helvetica so PDF generation never breaks — Cyrillic text
just won't render correctly in that case.
"""

import os

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

_REGULAR_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans.ttf",
]
_BOLD_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
]

_state = {"registered": False, "regular": "Helvetica", "bold": "Helvetica-Bold"}


def ensure_unicode_fonts() -> tuple[str, str]:
    """Register DejaVu Sans once and return (regular_name, bold_name)."""
    if _state["registered"]:
        return _state["regular"], _state["bold"]

    regular_path = next((p for p in _REGULAR_CANDIDATES if os.path.exists(p)), None)
    if regular_path:
        pdfmetrics.registerFont(TTFont("DejaVuSans", regular_path))
        _state["regular"] = "DejaVuSans"

        bold_path = next((p for p in _BOLD_CANDIDATES if os.path.exists(p)), None)
        if bold_path:
            pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", bold_path))
            _state["bold"] = "DejaVuSans-Bold"
        else:
            _state["bold"] = "DejaVuSans"

    _state["registered"] = True
    return _state["regular"], _state["bold"]
