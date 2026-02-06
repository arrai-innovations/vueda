---
title: Send Email from VDQ with Anymail
type: how-to
audience: implementor
status: brainstorming
---

# Send Email from VDQ with Anymail

## When to Use This

Use this when outbound email should be queued, tracked, and retried through VDQ.

## Goal

Implement reliable queued email delivery with attachments and audit-friendly status.

## Prerequisites

- Anymail provider configuration is available
- Sender and receiver models are mapped
- Email templates and content sources are defined
## Planned Steps (Brainstorm)

- Create queue items for email method with sender/receiver context
- Build AnyMail queue item payload including subject/body and recipients
- Handle attachments and content type metadata safely
- Track send results and transition queue states appropriately
- Test success, provider failure, and retry scenarios
## Verification (Brainstorm)

- Queued emails are sent with correct recipients/content
- Failures capture actionable error details
- Retries do not duplicate or corrupt message state
