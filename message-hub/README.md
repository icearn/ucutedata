# Message Hub

Shared notification delivery layer for sibling apps such as `kiwisaver-insight` and `spending-track`.

## Purpose

`message-hub` decouples domain applications from outbound channels. Producers publish a normalized notification envelope onto Kafka. `message-hub` consumes those events and dispatches them to configured channels such as:

- Slack
- Email via SMTP
- WhatsApp via webhook adapter
- SMS via webhook adapter
- Generic webhook / IM adapters
- Console logging for local development

The current default route is intentionally safe: `common_api` messages fan out to `console` unless you configure real channels.

## Event Contract

Kafka topic: `message-hub.notifications.v1`

Example envelope:

```json
{
  "message_id": "5e25d9f1-3c22-4db7-b55a-b574d1525eb0",
  "source_app": "kiwisaver-insight",
  "event_type": "kiwisaver_price_alert",
  "user_id": "user_123",
  "channel": "common_api",
  "channel_target": null,
  "title": "ASB KiwiSaver Growth Fund hit 3.4881",
  "body": "ASB KiwiSaver Growth Fund closed at 3.4881 on 2026-03-31.",
  "payload": {
    "provider": "ASB",
    "scheme": "Growth Fund"
  },
  "tags": {
    "provider": "ASB",
    "scheme": "Growth Fund"
  },
  "created_at_utc": "2026-04-02T01:00:00+00:00"
}
```

`channel` rules:

- `common_api` or empty: use `MESSAGE_HUB_DEFAULT_CHANNELS`
- `slack`: send to Slack webhook
- `email`: send via SMTP to `channel_target`
- `sms`, `whatsapp`, `im`, `webhook`: post to configured webhook target
- comma-separated values are supported, for example `slack,email`

## Local Run

### Host process

```bash
cd message-hub
pip install -r requirements.txt
uvicorn message_hub.api:app --reload --host 0.0.0.0 --port 8010
```

Defaults:

- API: `http://localhost:8010`
- Kafka bootstrap: `localhost:9094`
- Topic: `message-hub.notifications.v1`

### Docker

The KiwiSaver compose stack can build and run this service directly. Once the updated compose file is up, the hub is exposed at:

- `http://localhost:8010`

## Environment

- `KAFKA_BOOTSTRAP_SERVERS`
- `MESSAGE_HUB_TOPIC`
- `MESSAGE_HUB_CONSUMER_GROUP`
- `MESSAGE_HUB_DEFAULT_CHANNELS`
- `SLACK_WEBHOOK_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`
- `SMTP_USE_TLS`
- `SMS_WEBHOOK_URL`
- `WHATSAPP_WEBHOOK_URL`
- `IM_WEBHOOK_URL`
- `MESSAGE_HUB_WEBHOOK_TARGETS_JSON`

## API

- `GET /health`
- `GET /api/channels`
- `POST /api/messages/publish`
- `POST /api/messages/dispatch`

`/api/messages/publish` writes to Kafka.

`/api/messages/dispatch` bypasses Kafka and directly exercises the channel dispatcher, which is useful for dry runs during setup.
