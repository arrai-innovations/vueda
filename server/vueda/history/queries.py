"""The queries behind the action-grouped history response.

A page is a page of actions, not of events, so grouping happens in the database before the
paginator sees anything. That takes two reads: one for the page of groups, and one for the events
belonging to those groups. Neither grows with the number of events on the page.

Both reads run over the same union. Its parts are pghistory's events that reference the object,
which are the object's own events and the events of rows with a foreign key to it, and the
object's workflow state events.
"""

__all__ = (
    "GROUP_KEY",
    "action_groups_for",
    "events_in_groups",
)

from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import BigIntegerField
from django.db.models import Case
from django.db.models import CharField
from django.db.models import F
from django.db.models import Func
from django.db.models import Min
from django.db.models import TextField
from django.db.models import Value
from django.db.models import When
from django.db.models.functions import Cast
from django.db.models.functions import Coalesce
from django_cte import CTE
from django_cte import with_cte
from pghistory.models import Events

from vueda.history.visibility import self_predicate
from vueda.history.visibility import visibility_predicate


#: An action groups its events. An event recorded outside any action is a group of its own, keyed
#: by its own identity, so a null context never collects unrelated writes into one false action.
GROUP_KEY = Coalesce(Cast("pgh_context_id", TextField()), F("pgh_slug"))

#: The name of the common table expression that holds the object's visible events. pghistory names
#: its own expression after the ``Events`` table, so this one needs a name of its own.
HISTORY_EVENTS = "vueda_history_events"


def _referencing_events(instance, user):
    """The visible events that pghistory finds through the object: its own and its related rows'."""
    relation = Case(When(self_predicate(instance), then=Value("self")), default=Value("related"))
    return (
        Events.objects.references(instance)
        .filter(visibility_predicate(instance, user))
        .annotate(group_key=GROUP_KEY, relation=relation)
    )


def _visible_parts(instance, user, state_events):
    """The querysets whose union is every event of the object's history that the requester may see.

    ``state_events`` holds the object's workflow state events, as
    :func:`vueda.history.sources.state_events_for` returns them. They are visible to anyone the
    endpoint lets read the object, so they take no filter. Each part carries the same annotations,
    which a union needs.
    """
    return [
        _referencing_events(instance, user),
        *(events.annotate(group_key=GROUP_KEY, relation=Value("state")) for events in state_events),
    ]


def _union(parts):
    return parts[0].union(*parts[1:], all=True) if len(parts) > 1 else parts[0]


class _First(Func):
    """The first element of an ordered array aggregate."""

    arity = 1
    template = "(%(expressions)s)[1]"


#: The order of events inside a group, which also names the group's earliest event.
EVENT_ORDER = ("pgh_created_at", "pgh_obj_model", "pgh_id")

#: The columns that grouping reads.
GROUPING_COLUMNS = ("group_key", *EVENT_ORDER)


def action_groups_for(instance, user, state_events):
    """One row per action, newest first, ready to paginate.

    ``state_events`` names the object's workflow state events, as
    :func:`vueda.history.sources.state_events_for` returns them.

    Django cannot group a union, so the union runs as a common table expression and the grouping
    selects from it. Each part selects only the columns that grouping reads. That lets the database
    skip building every event's data and difference, which is most of the cost of a long history.

    Actions that share a recorded time break the tie on their earliest event's identifier parts,
    the tracked model label and then the numeric event id, which is the published rule. That keeps
    a page boundary in the same place between requests without comparing identifiers as strings,
    where ``:9`` would sort after ``:10``.
    """
    keys = [part.values(*GROUPING_COLUMNS) for part in _visible_parts(instance, user, state_events)]
    events = CTE(_union(keys), name=HISTORY_EVENTS)
    groups = (
        events.queryset()
        .values("group_key")
        .annotate(
            recorded_at=Min("pgh_created_at"),
            first_model=_First(ArrayAgg("pgh_obj_model", order_by=EVENT_ORDER), output_field=CharField()),
            first_id=_First(ArrayAgg("pgh_id", order_by=EVENT_ORDER), output_field=BigIntegerField()),
        )
        .order_by("-recorded_at", "first_model", "first_id")
    )
    return with_cte(events, select=groups)


def events_in_groups(instance, user, state_events, group_keys):
    """Every visible event of the named groups, in the order they were written.

    Each part is narrowed to the named groups before the union, so the database builds the data and
    difference of the page's events only. Each event carries the moment of its own write, so the
    recorded time orders a group faithfully. The tracked model label and the event id break a tie,
    which keeps a rendered group from reshuffling between requests. Each event is annotated with
    its ``group_key`` and its published ``relation``.
    """
    group_keys = list(group_keys)
    parts = [part.filter(group_key__in=group_keys) for part in _visible_parts(instance, user, state_events)]
    return _union(parts).order_by(*EVENT_ORDER)
