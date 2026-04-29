from typing import Optional

from pydantic import BaseModel


class NightModeUpdate(BaseModel):
    night_mode_enabled: bool
    night_mode_start: Optional[str] = None
    night_mode_end: Optional[str] = None
    night_mode_block_media: bool = False
    night_mode_block_text: bool = False


class NightModeResponse(BaseModel):
    night_mode_enabled: bool
    night_mode_start: Optional[str] = None
    night_mode_end: Optional[str] = None
    night_mode_block_media: bool
    night_mode_block_text: bool
