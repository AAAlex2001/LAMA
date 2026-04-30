from dataclasses import dataclass


@dataclass(frozen=True)
class CallbackButtonTarget:
    entity_id: int
    button_id: str


class GetCallbackButtonTarget:
    def execute(self, data: str | None) -> CallbackButtonTarget | None:
        if not data:
            return None

        parts = data.split(":")
        if len(parts) < 3:
            return None

        try:
            entity_id = int(parts[1])
        except ValueError:
            return None

        return CallbackButtonTarget(
            entity_id=entity_id,
            button_id=":".join(parts[2:]),
        )
