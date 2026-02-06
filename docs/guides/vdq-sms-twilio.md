---
title: Send SMS from VDQ with Twilio
type: how-to
audience: implementor
status: brainstorming
---

# Send SMS from VDQ with Twilio

## When to Use This

Use this when SMS notifications should be dispatched asynchronously with retry support.

## Goal

Implement Twilio-backed SMS delivery through queue items and workflow transitions.

## Prerequisites

- Twilio credentials and caller ID are configured
- Receiver phone number handling is validated
- Message content and rate expectations are defined
## Planned Steps (Brainstorm)

- Create SMS queue items with sender, receiver, and message payload
- Implement scheduler/handler flow to call Twilio APIs
- Map Twilio failures to queue item result and retry behavior
- Protect against duplicate sends across retries
- Test delivery for success, transient failure, and hard failure
## Verification (Brainstorm)

- SMS messages send with expected content and metadata
- Retry logic behaves correctly for transient errors
- Queue state and logs make failures diagnosable
