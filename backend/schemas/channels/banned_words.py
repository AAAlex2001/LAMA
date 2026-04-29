from pydantic import BaseModel


class BannedWordsToggle(BaseModel):
    enabled: bool


class BannedWordsToggleResponse(BaseModel):
    banned_words_enabled: bool
