---
title: Model History Response
type: explanation
audience: integrator
status: draft
---

# Model History Response

The `history-list` endpoint, {@api py:function:vueda.core.viewsets.VuedaViewSet.history_list}, returns one object's {@term Model History} as the user actions that produced it. This page describes which events the response includes, which of them a requester sees, and how events group into actions. {@api vue:component:ViewHistoryList} renders the response.

## Response Shape

A page holds action groups, newest first. An action group is one user action, such as one request, one task run, or one transition. It holds the events that the action wrote to this object's history. An event is one write to one row. It lists the fields that the write changed.

Here is one transition that approved application 7 and, in its `on_transition` hook, set the application's `approver`:

```json
{
    "id": "6f0d2c1e-8a4b-4f6e-9a57-0c3d2f1b7e21",
    "action_id": "6f0d2c1e-8a4b-4f6e-9a57-0c3d2f1b7e21",
    "recorded_at": "2026-10-21T16:02:11.304Z",
    "kind": "request",
    "label": "approve",
    "actor": { "id": 12, "display": "Ada Admin", "missing": false },
    "events": [
        {
            "id": "vueda_workflow.ObjectState:4410",
            "model": "vueda_workflow.ObjectState",
            "object_id": "318",
            "relation": "state",
            "type": "updated",
            "recorded_at": "2026-10-21T16:02:11.304Z",
            "changes": [
                {
                    "field": "state",
                    "old": { "id": 3, "display": "Pending", "missing": false },
                    "new": { "id": 4, "display": "Approved", "missing": false }
                }
            ]
        },
        {
            "id": "grants.Application:9172",
            "model": "grants.Application",
            "object_id": "7",
            "relation": "self",
            "type": "updated",
            "recorded_at": "2026-10-21T16:02:11.309Z",
            "changes": [
                { "field": "approver", "old": null, "new": { "id": 12, "display": "Ada Admin", "missing": false } }
            ]
        }
    ]
}
```

{@api py:class:vueda.history.serializers.actions.HistoryActionGroupSerializer} and {@api py:class:vueda.history.serializers.actions.HistoryEventSerializer} declare each field. A field that holds a reference to another row carries `{ id, display, missing }` on each side. `display` is the row's name now, not its name when the event happened. `missing` is `true` when the row no longer exists. A `created` or `deleted` event carries an empty `changes` list.

## Which Events the Response Includes

The response includes three sets of events. Each event's `relation` says which set it belongs to.

| `relation` | Events                                                                                 | Example, in an order's history                      |
| ---------- | -------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `self`     | Writes to the requested object itself.                                                 | The order's `shipping_address` changed.             |
| `related`  | Writes to a row that has a foreign key to the requested object.                        | An order line that points at the order was deleted. |
| `state`    | Changes to the requested object's workflow state, on a {@term Workflow-Enabled Model}. | The order moved from `pending` to `approved`.       |

A `self` or `related` event's `model` and `object_id` name the row that was written. A `state` event's `model` and `object_id` name the `ObjectState` record that holds the object's state. That record means nothing to a reader, so a client shows the event as the object's workflow state instead. {@api vue:component:ViewHistoryList} shows "Workflow state" in its Model cell.

The response leaves out these events:

- The object's initial workflow state. Workflow records it when the object is first saved, and no transition caused it, so it is not a history entry. Every `state` event has the type `updated`.
- Workflow state changes of related rows. A customer's history does not include the state changes of the customer's orders.
- Writes to rows that the requested object points at. An order's history does not include edits to its customer.
- Writes of the same action to other objects. A bulk transition over two orders shows each order only its own events.

## Which Events a Requester Sees

The server filters events before it builds a page. A hidden event leaves no trace in the page or in the count.

- **`self` and `state` events.** The endpoint first checks that the requester can read the object. A requester who cannot read it receives `403`. A requester who can read it sees every `self` and `state` event, because workflow state follows the object's own `read` permission.
- **`related` events.** An event on a related row needs the requester to hold `read` on the row's model. With that permission, an event on a live row is visible while the requester can read the row. An event on a deleted row is visible only when the row's model has no row-dependent authorization, which means no `RowLevelPermissions` and no workflow. Otherwise the row's permission can no longer be checked, and the event is hidden.

This is server enforcement. The client renders the events that the server returns.

## How Events Group into Actions

An action is the pghistory context that was open when the write happened. Every event written inside one action belongs to one group. An event written with no action open forms a group of its own, with `action_id`, `kind`, `label`, and `actor` set to `null`.

A group's `kind` says what started the action, and its `label` names the operation:

| Source                                                                 | `kind`      | `label`                                                 |
| ---------------------------------------------------------------------- | ----------- | ------------------------------------------------------- |
| A request to a {@api py:class:vueda.core.viewsets.VuedaViewSet} action | `request`   | The DRF action name, such as `update` or `destroy`      |
| A request to `execute-transition`                                      | `request`   | The transition code, such as `approve`                  |
| A request to any other view                                            | `request`   | `null`                                                  |
| A VDQ task                                                             | `task`      | The task name, such as `vdq.send_message`               |
| A generated workflow migration                                         | `migration` | The migration's change reason                           |
| An {@api py:function:vueda.core.audit.audited_action} block            | Its `kind`  | Its `action` argument. Its `kind` defaults to `system`. |
| A transition run with no action open                                   | `system`    | The transition code                                     |

`kind` is an open vocabulary. A project can add its own through `audited_action`, so a client must render a value that it does not recognize.

### Transitions

A transition's state change and the writes of its `on_transition` hook always share one action, so they appear as one group.

- A transition through `execute-transition` labels the request's action with the transition code. A bulk transition writes every object under that one action. Each object's history shows only that object's events.
- A transition inside another action joins it. The action keeps its own label. For example, a `PATCH` whose `save()` runs a transition stays `update`, and a VDQ task stays labelled with its task name. The `state` events in the group show which transitions ran.
- A transition run with no action open, for example from a shell or a script, opens its own action. The action's label is the transition code, its `kind` is `system`, and its actor is the user passed to the transition, or the system user when none is passed.

A dry run writes nothing, so it adds nothing to history.

## Order and Pagination

A page counts action groups, not events. Grouping happens in the database before pagination, so one action never splits across pages.

Groups are ordered newest first by their earliest event's time. Ties break on the earliest event's tracked model label, then its numeric event id. Events inside a group are ordered by the time of each write, with the same tie-break.
