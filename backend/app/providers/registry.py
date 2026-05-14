from app.providers.slack import SlackWebhookProvider
from app.providers.firewall import CloudflareProvider, MockFirewallProvider

# Centralized Registry
PROVIDERS = {
    "BLOCK_IP": CloudflareProvider(),
    "NOTIFY_WEBHOOK": SlackWebhookProvider(),
    "MARK_IOC": MockFirewallProvider(),
    "ISOLATE_HOST": MockFirewallProvider(),
    "DISABLE_USER": MockFirewallProvider()
}

def get_provider(action_type: str):
    return PROVIDERS.get(action_type)
