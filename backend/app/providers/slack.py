import requests
import structlog
from app.providers.base import BaseActionProvider
from app.core.config import settings

log = structlog.get_logger()

class SlackWebhookProvider(BaseActionProvider):
    def execute(self, action_data: dict, dry_run: bool = False) -> dict:
        url = settings.SLACK_WEBHOOK_URL
        
        payload = {
            "text": f"🚨 *MediShield Containment Action*",
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "🛡️ MediShield Containment Alert"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*Action:*\n{action_data.get('action_type', 'N/A')}"},
                        {"type": "mrkdwn", "text": f"*Target:*\n`{action_data.get('target_value', 'N/A')}`"}
                    ]
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Notes:*\n{action_data.get('notes') or '_No analyst notes provided_'}"
                    }
                }
            ]
        }

        if not url:
            log.warning("slack_provider.not_configured", action=action_data.get('action_type'))
            return {"status": "skipped", "message": "Slack webhook URL not configured"}

        if dry_run:
            log.info("slack_provider.dry_run", payload=payload)
            return {"status": "dry_run", "message": "Slack notification simulated"}

        try:
            res = requests.post(url, json=payload, timeout=5)
            res.raise_for_status()
            return {"status": "success", "message": "Slack notification sent"}
        except Exception as e:
            log.error("slack_provider.error", error=str(e))
            return {"status": "failed", "error": str(e)}
