from abc import ABC, abstractmethod

class BaseActionProvider(ABC):
    @abstractmethod
    def execute(self, action_data: dict, dry_run: bool = False) -> dict:
        pass
