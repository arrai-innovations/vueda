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

from django.db.models import F
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


def action_groups_for(instance, user):
    """One row per action, newest first, ready to paginate.

    Actions that share a recorded time break the tie on the group key, which is unique, so a page
    boundary stays in the same place between requests. The database records an event time per
    transaction, so two actions tie only when one transaction produced both.
    """
    return (
        _visible_events(instance, user)
        .values("group_key")
        .annotate(recorded_at=Min("pgh_created_at"))
        .order_by("-recorded_at", "group_key")
    )


def events_in_groups(instance, user, group_keys):
    """Every visible event of the named groups, in the order they belong in a group.

    Events of one action share a recorded time whenever one transaction produced them, so the
    tracked model label and the event id decide the order in practice. Both are stable, which is
    what keeps a rendered group from reshuffling between requests.
    """
    return (
        _visible_events(instance, user)
        .filter(group_key__in=list(group_keys))
        .order_by("pgh_created_at", "pgh_obj_model", "pgh_id")
    )
