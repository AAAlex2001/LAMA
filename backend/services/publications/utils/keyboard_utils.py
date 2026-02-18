from typing import Optional

from backend.models.publications import Publication


def prepare_inline_keyboard_data(publication: Publication) -> Optional[dict]:
    """Prepare inline keyboard payload and inject callback_data for hidden_text buttons."""
    if not publication.inline_keyboard:
        return None

    raw = publication.inline_keyboard
    if isinstance(raw, dict):
        rows = raw.get("buttons", [])
    elif isinstance(raw, list):
        rows = raw
    else:
        return None

    if not rows:
        return None

    prepared_rows = []
    for row_idx, row in enumerate(rows):
        if not isinstance(row, list):
            continue

        prepared_row = []
        for btn_idx, btn in enumerate(row):
            if not isinstance(btn, dict):
                continue

            btn_type = btn.get("type")
            hidden_text = btn.get("hidden_text")

            if btn_type == "hidden_text" or hidden_text:
                button_id = btn.get("id") or f"{row_idx}-{btn_idx}"
                callback_data = btn.get("callback_data") or f"hidden_text:{publication.id}:{button_id}"
                prepared_btn = {**btn, "callback_data": callback_data}
                prepared_btn.pop("url", None)
                prepared_row.append(prepared_btn)
            else:
                prepared_row.append(btn)

        if prepared_row:
            prepared_rows.append(prepared_row)

    return {"buttons": prepared_rows} if prepared_rows else None
