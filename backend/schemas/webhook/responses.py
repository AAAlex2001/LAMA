from pydantic import BaseModel


class WebhookAcceptedResponse(BaseModel):
    """Ответ Telegram'у: ok + опц. error."""

    ok: bool = True
    error: str | None = None
