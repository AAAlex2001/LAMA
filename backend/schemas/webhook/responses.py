from pydantic import BaseModel


class WebhookAcceptedResponse(BaseModel):
    ok: bool = True
    error: str | None = None
