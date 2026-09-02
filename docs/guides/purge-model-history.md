---
title: Purge Model History Rows
type: how-to
audience: integrator
status: draft
---

# Purge Model History Rows

VUEDA ships no retention policy. With `vueda.history` installed, every tracked model keeps every event it has ever recorded, and those tables only grow. When history stops being useful depends on your data, your regulator, and your storage budget. VUEDA leaves that call to you.

This guide covers deleting event rows once you have decided which ones to remove.

## Why a Plain Delete Fails

VUEDA sets `PGHISTORY_APPEND_ONLY`, so each event table carries a PostgreSQL trigger named `append_only` that rejects every `UPDATE` and `DELETE`. An ordinary delete raises:

```text
pgtrigger: Cannot update or delete rows from store_invoiceevent table
```

The database enforces this, not application code, so a raw SQL statement fails the same way. That is the point: an audit trail nobody can quietly edit is worth more than one that a stray queryset can rewrite.

## Delete Through `pgtrigger.ignore`

`pgtrigger.ignore` suspends a named trigger for the current thread. Name the event model's `append_only` trigger, delete inside the block, and the trigger resumes on exit:

```py
import pgtrigger
from django.apps import apps

event_model = apps.get_model("store", "InvoiceEvent")

with pgtrigger.ignore(f"{event_model._meta.label}:append_only"):
    event_model.objects.filter(pgh_created_at__lt=cutoff).delete()
```

The trigger URI is the event model's label and the trigger name, joined by a colon: `store.InvoiceEvent:append_only`.

Name the trigger rather than calling `pgtrigger.ignore()` with no arguments. Calling it bare suspends every trigger in the thread. That includes the insert, update, and delete triggers that record history, so any write inside the block goes unrecorded.

## Find the Event Model for a Tracked Model

Event models follow their tracked model's name plus `Event`, and live in the tracked model's own app:

```py
from django.apps import apps

tracked = apps.get_model("store", "Invoice")
event_model = apps.get_model(tracked._meta.app_label, f"{tracked.__name__}Event")
```

To purge across every tracked model, filter the app registry on the marker attribute pghistory sets:

```py
event_models = [model for model in apps.get_models() if getattr(model, "pgh_tracked_model", None) is not None]
```

## Write It as a Management Command

Purging is a scheduled operation, so it belongs in a management command rather than a shell session. Wrap the whole run in an action context so the writes it makes elsewhere stay attributable:

```py
from datetime import timedelta

import pgtrigger
from django.apps import apps
from django.core.management.base import BaseCommand
from django.utils import timezone

from vueda.core.audit import audited_action


class Command(BaseCommand):
    help = "Delete history events older than the retention window."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, required=True)

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=options["days"])
        event_models = [m for m in apps.get_models() if getattr(m, "pgh_tracked_model", None) is not None]

        with audited_action("history.purge", cutoff=cutoff.isoformat()):
            for event_model in event_models:
                with pgtrigger.ignore(f"{event_model._meta.label}:append_only"):
                    deleted, _ = event_model.objects.filter(pgh_created_at__lt=cutoff).delete()
                self.stdout.write(f"{event_model._meta.label}: {deleted}")
```

## What a Purge Costs

A purge is not reversible. The rows are gone, and the events that remain no longer describe the full life of an object. An object created before the cutoff and never touched since ends up with no events at all. That reads as "no history" rather than "history removed".

Removing events does not remove the context rows they pointed at. A `pghistory.Context` row survives its last event and becomes unreachable through normal history queries. Delete those separately if they matter to your storage budget, and only after the events referencing them are gone.

Take a backup you can restore from before the first run, and run with a generous `--days` value once before scheduling it.

## Related

- [Model Feature Policy](../core-concepts/model-feature-policy.md) covers `class Vueda.History`, including how to stop tracking a model or keep a column out of its event table.
