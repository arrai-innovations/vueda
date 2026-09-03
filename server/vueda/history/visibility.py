"""Which history events a requester may read.

The rule has two halves. Events on the requested object are visible, because the endpoint has
already authorized that object. Events on a related row follow that row: visible while the
requester can read it, and after deletion only when the model's visibility never depended on the
row in the first place.

Every part of the rule is a query predicate, so the filter runs before pagination and a hidden
event leaves no trace in a page count.
"""

__all__ = (
    "related_tracked_models",
    "visibility_predicate",
)

import pghistory.core
from django.db.models import Q
from django.db.models import Subquery
from django.db.models import TextField
from django.db.models.functions import Cast

from vueda.core.permissions import filter_rows_for_user
from vueda.core.permissions import has_row_dependent_authorization


def _label(model):
    """The tracked model label the aggregate reports, which is always the concrete one."""
    return model._meta.concrete_model._meta.label


def _readable_pks(model, user):
    """The rows this user may read now, keyed for the event join.

    The aggregate casts every object id to text, so the live primary key needs the same cast
    before it can be compared.
    """
    queryset = filter_rows_for_user(model.objects.all(), user, perm_type="read")
    return queryset.annotate(_pgh_join_pk=Cast("pk", TextField())).values("_pgh_join_pk")


def related_tracked_models(model):
    """Every tracked model whose events can reference ``model``, excluding the model itself.

    The schema decides this list, so the number of subqueries the predicate builds depends on the
    shape of the models rather than on how much history exists.
    """
    concrete = model._meta.concrete_model
    return [
        event_model.pgh_tracked_model
        for event_model in pghistory.core.event_models(references_model=concrete)
        if event_model.pgh_tracked_model._meta.concrete_model is not concrete
    ]


def visibility_predicate(instance, user):
    """A predicate over the aggregate event columns for one requested object and one requester."""
    model = type(instance)
    # The endpoint authorized the requested object, so its own events need no further check.
    predicate = Q(pgh_obj_model=_label(model), pgh_obj_id=str(instance.pk))

    for related in related_tracked_models(model):
        meta = related._meta
        if not user.has_perm(f"{meta.app_label}.read_{meta.model_name}"):
            continue

        if has_row_dependent_authorization(related):
            # A deleted row is absent from the live queryset, so it drops out with no second
            # clause. That is the intended answer: its permission can no longer be reconstructed.
            predicate |= Q(
                pgh_obj_model=_label(related),
                pgh_obj_id__in=Subquery(_readable_pks(related, user)),
            )
        else:
            # Nothing about this model's visibility depends on the row, so a deleted row's events
            # stay readable by exactly the people who could read the row.
            predicate |= Q(pgh_obj_model=_label(related))

    return predicate
