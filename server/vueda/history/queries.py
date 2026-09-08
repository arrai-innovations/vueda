"""The queries behind the action-grouped history response.

A page is a page of actions, not of events, so grouping happens in the database before the
paginator sees anything. That takes two reads: one for the page of groups, and one for the events
belonging to those groups. Neither grows with the number of events on the page.
"""

__all__ = (
    "GROUP_KEY",
    "action_groups_for",
    "events_in_groups",
)

from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import BigIntegerField
from django.db.models import CharField
from django.db.models import F
from django.db.models import Func
from django.db.models import Min
from django.db.models import TextField
from django.db.models.functions import Cast
from django.db.models.functions import Coalesce
from pghistory.models import Events

from vueda.history.visibility import visibility_predicate


#: An action groups its events. An event recorded outside any action is a group of its own, keyed
#: by its own identity, so a null context never collects unrelated writes into one false action.
GROUP_KEY = Coalesce(Cast("pgh_context_id", TextField()), F("pgh_slug"))


def _visible_events(instance, user):
    return (
        Events.objects.references(instance).filter(visibility_predicate(instance, user)).annotate(group_key=GROUP_KEY)
    )


class _First(Func):
    """The first element of an ordered array aggregate."""

    arity = 1
    template = "(%(expressions)s)[1]"


#: The order of events inside a group, which also names the group's earliest event.
EVENT_ORDER = ("pgh_created_at", "pgh_obj_model", "pgh_id")


def action_groups_for(instance, user):
    """One row per action, newest first, ready to paginate.

    Actions that share a recorded time break the tie on their earliest event's identifier parts,
    the tracked model label and then the numeric event id, which is the published rule. That keeps
    a page boundary in the same place between requests without comparing identifiers as strings,
    where ``:9`` would sort after ``:10``.
    """
    return (
        _visible_events(instance, user)
        .values("group_key")
        .annotate(
            recorded_at=Min("pgh_created_at"),
            first_model=_First(ArrayAgg("pgh_obj_model", order_by=EVENT_ORDER), output_field=CharField()),
            first_id=_First(ArrayAgg("pgh_id", order_by=EVENT_ORDER), output_field=BigIntegerField()),
        )
        .order_by("-recorded_at", "first_model", "first_id")
    )


def events_in_groups(instance, user, group_keys):
    """Every visible event of the named groups, in the order they were written.

    Each event carries the moment of its own write, so the recorded time orders a group faithfully.
    The tracked model label and the event id break a tie, which keeps a rendered group from
    reshuffling between requests.
    """
    return _visible_events(instance, user).filter(group_key__in=list(group_keys)).order_by(*EVENT_ORDER)
