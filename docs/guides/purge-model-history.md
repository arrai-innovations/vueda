---
title: Purge Model History Rows
type: how-to
audience: integrator
status: draft
---

# Purge Model History Rows

{@term Model History} writes an event row for every insert and delete on a tracked model, and for every update that changes a tracked column. VUEDA tracks every {@term VUEDA Model} unless its feature policy opts out, as [Model Feature Policy](../core-concepts/model-feature-policy.md#history-and-workflow) describes. VUEDA sets no retention policy, so event tables grow until you delete rows.

[`QueueItem`]{@api py:class:vueda.vdq.models.QueueItem} is the table to plan for. VDQ writes one {@term Queue Item} per outbound message and updates it as delivery proceeds. Each update copies the item's [`result`]{@api py:function:vueda.vdq.models.QueueItem.result} text, which holds provider output, into a new event row.

This guide deletes event rows older than a cutoff that you choose.

## Why a Plain Delete Fails

VUEDA sets `PGHISTORY_APPEND_ONLY`, so each event table carries a PostgreSQL trigger named `append_only` that rejects every `UPDATE` and `DELETE`. An ordinary delete raises:

```text
pgtrigger: Cannot update or delete rows from store_invoiceevent table
```

The database enforces the trigger, so a raw SQL statement fails the same way.

## Delete Through `pgtrigger.ignore`

`pgtrigger.ignore` suspends a named trigger for the current thread. Name the event model's `append_only` trigger and delete inside the block. The trigger resumes on exit:

```py
import pgtrigger
from django.apps import apps

event_model = apps.get_model("store", "InvoiceEvent")

with pgtrigger.ignore(f"{event_model._meta.label}:append_only"):
    event_model.objects.filter(pgh_created_at__lt=cutoff).delete()
```

The trigger URI is the event model's label and the trigger name, joined by a colon: `store.InvoiceEvent:append_only`.

Always name the trigger. A bare `pgtrigger.ignore()` suspends every trigger in the thread, including the triggers that record history, so any tracked write inside the block goes unrecorded.

## Find the Event Models

Every event model carries a `pgh_tracked_model` attribute that points at its tracked model. Filter the app registry on it to find all event models:

```py
from django.apps import apps

event_models = [model for model in apps.get_models() if getattr(model, "pgh_tracked_model", None) is not None]
```

The default event model name is the tracked model's name plus `Event`, in the tracked model's app: `store.Invoice` gets `store.InvoiceEvent`. A model that your project tracks with its own [`pghistory.track`]{@api ext:pghistory:pghistory.track} call and a `model_name` argument gets that name instead. The registry filter finds both.

Leave the `vueda_workflow` event models out of the purge. VUEDA reads these events later. [`makeworkflowmigrations`]{@api py:class:vueda.workflow.management.commands.makeworkflowmigrations.Command} builds each {@term Workflow Migration} from the workflow, state, and transition events. When a workflow's initial state changes, the object state events tell the command which objects nobody has moved since creation. After a purge, an object that someone moved long ago looks unmoved, and the next initial state change moves it back. Filter those models out by app label:

```py
event_models = [model for model in event_models if model._meta.app_label != "vueda_workflow"]
```

## Write a Management Command

Put the purge in a [management command]{@api ext:django:django.core.management.BaseCommand} so it runs the same way each time:

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
        event_models = [
            m
            for m in apps.get_models()
            if getattr(m, "pgh_tracked_model", None) is not None and m._meta.app_label != "vueda_workflow"
        ]

        with audited_action("history.purge", kind="command", cutoff=cutoff.isoformat()):
            for event_model in event_models:
                with pgtrigger.ignore(f"{event_model._meta.label}:append_only"):
                    deleted, _ = event_model.objects.filter(pgh_created_at__lt=cutoff).delete()
                self.stdout.write(f"{event_model._meta.label}: {deleted}")
```

Event tables are untracked, so the deletes record no events. [`audited_action`]{@api py:function:vueda.core.audit.audited_action} groups any tracked writes that you add to the command under one action with `kind="command"`.

## Delete Orphaned Context Rows

Each event points at a [`pghistory.Context`]{@api ext:pghistory:pghistory.models.Context} row that records the action and acting user. Deleting events leaves those rows in place. After the events are gone, delete the context rows that no event references. Check every event model here, including the `vueda_workflow` ones that the purge skips:

```py
from django.apps import apps
from pghistory.models import Context

all_event_models = [model for model in apps.get_models() if getattr(model, "pgh_tracked_model", None) is not None]

orphans = Context.objects.all()
for event_model in all_event_models:
    orphans = orphans.exclude(pk__in=event_model.objects.filter(pgh_context__isnull=False).values("pgh_context"))
orphans.delete()
```

The `pgh_context__isnull=False` filter matters. A `NULL` in the subquery makes PostgreSQL's `NOT IN` match no rows, so the delete removes nothing.

## Before the First Run

A purge cannot be undone. The remaining events no longer describe the full life of an object. An object created before the cutoff and never changed since has no events at all, which reads the same as an object with no history.

Take a backup that you can restore from, then run the command once with a large `--days` value and check its output before you schedule it.
