from backend.models.bots import Bot as BotModel


class NormalizeCommand:
    def execute(self, command_text: str, bot_model: BotModel) -> str:
        normalized = command_text.strip().lower()
        bot_username = (bot_model.username or "").lower()
        if bot_username and normalized.endswith(f"@{bot_username}"):
            return normalized[: -(len(bot_username) + 1)]
        return normalized
