from typing import List, Optional

from pydantic import BaseModel


class QuickCommandsUpdate(BaseModel):
    commands_enabled: bool
    enabled_commands: Optional[List[str]] = None


class QuickCommandsResponse(BaseModel):
    commands_enabled: bool
    enabled_commands: Optional[List[str]] = None
