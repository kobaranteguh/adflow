# adflow-sdk (Python)

Official Python SDK for the **AdFlow bridge** — Meta Marketing (Ads), Threads, and **free** Facebook
Pages & Instagram, through AdFlow's Meta-App-Review-approved app. Zero dependencies.

## Install
```bash
pip install adflow-sdk
```

## Quick start
```python
from adflow_sdk import AdFlow, AdFlowError

adflow = AdFlow(api_key="ak_live_…")

client = adflow.clients.create("Kedai ABC")
print(client["onboardUrl"])

adflow.account("act_123").create_campaign(name="Q3", objective="OUTCOME_TRAFFIC", status="PAUSED")
adflow.profile("17841400000000000").publish(mediaType="TEXT", text="Hello")
adflow.page("1029384").create_post(message="Hi")
```

## Errors
Raises `AdFlowError` with `.code` and `.status`.

## License
MIT
