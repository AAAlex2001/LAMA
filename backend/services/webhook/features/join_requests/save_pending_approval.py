from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.bots import Bot as BotModel, PendingJoinApproval


class SavePendingApproval:
    def __init__(self, db: AsyncSession, bot_model: BotModel):
        self.db = db
        self.bot_model = bot_model

    async def execute(
        self,
        user_id: int,
        chat_id: int,
        missing_channels: list[int],
    ) -> None:
        self.db.add(
            PendingJoinApproval(
                bot_id=self.bot_model.id,
                user_id=user_id,
                chat_id=chat_id,
                missing_channels=missing_channels,
            )
        )
        await self.db.flush()
