from enum import Enum


class ChannelType(str, Enum):
    CHANNEL = "CHANNEL"
    GROUP = "GROUP"
    SUPERGROUP = "SUPERGROUP"


class BackupMode(str, Enum):
    DISABLED = "DISABLED"
    ENABLED = "ENABLED"
    INSTANT = "INSTANT"
    POST_FACTUM = "POST_FACTUM"


class BackupStatus(str, Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    IN_PROGRESS = "IN_PROGRESS"
