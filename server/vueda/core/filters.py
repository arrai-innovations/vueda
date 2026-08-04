"""Filter backends for array parameters, trigram search, and full-text ranking."""

__all__ = (
    "SEARCH_LOOKUP_PREFIX",
    "TRIGRAM_SIMILAR_PREFIX",
    "TRIGRAM_WORD_SIMILAR_PREFIX",
    "BaseArrayFilter",
    "BaseArrayInFilter",
    "IdInFilterSet",
    "ModelChoiceArrayFilter",
    "NumberArrayFilter",
    "VuedaCompositePrimaryKeyFilterSet",
    "VuedaFilterSet",
    "VuedaSearchFilterBackend",
)

import operator
import re
from functools import reduce

from django import forms
from django.contrib.postgres.search import SearchQuery
from django.contrib.postgres.search import SearchRank
from django.contrib.postgres.search import SearchVector
from django.contrib.postgres.search import TrigramSimilarity
from django.db import models
from django.db.models.constants import LOOKUP_SEP
from django.db.models.functions import Greatest
from django.utils.translation import gettext_lazy as _
from django_filters import ModelChoiceFilter
from django_filters import rest_framework
from ordered_set import OrderedSet
from rest_framework.filters import SearchFilter
from rest_framework.settings import api_settings

from vueda.core.fields.form import BaseArrayField


class BaseArrayFilter(rest_framework.Filter):
    """
    Base class for array type filters, such as IN and RANGE.
    """

    base_field_class = BaseArrayField

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("help_text", _("Multiple values may be separated by commas."))
        super().__init__(*args, **kwargs)

        class ConcreteArrayField(self.base_field_class, self.field_class):  # type: ignore
            pass

        ConcreteArrayField.__name__ = self._field_class_name(self.field_class, self.lookup_expr)

        self.field_class = ConcreteArrayField

    @classmethod
    def _field_class_name(cls, field_class, lookup_expr):
        """
        Generate a suitable class name for the concrete field class. This is not
        completely reliable, as not all field class names are of the format
        <Type>Field.

        ex::

            BaseArrayFilter._field_class_name(DateTimeField, 'year__in')

            returns 'DateTimeYearInField'

        """
        # DateTimeField => DateTime
        type_name = field_class.__name__
        type_name = type_name.removesuffix("Field")

        # year__in => YearIn
        parts = lookup_expr.split(LOOKUP_SEP)
        expression_name = "".join(p.capitalize() for p in parts)

        # DateTimeYearInField
        return f"{type_name}{expression_name}Field"


class BaseArrayInFilter(BaseArrayFilter):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("lookup_expr", "in")
        super().__init__(*args, **kwargs)


class NumberArrayFilter(BaseArrayInFilter, rest_framework.NumberFilter):
    pass


class IdInFilterSet(rest_framework.FilterSet):
    id = NumberArrayFilter(field_name="id", lookup_expr="in", widget=forms.HiddenInput)


class VuedaFilterSet(IdInFilterSet):
    pass


class VuedaCompositePrimaryKeyFilterSet(rest_framework.FilterSet):
    """
    We can't have a default 'pk' filter.
    We would want filters for each field that combines to make the pk.
    """


TRIGRAM_SIMILAR_PREFIX = "#"
TRIGRAM_WORD_SIMILAR_PREFIX = "~"
SEARCH_LOOKUP_PREFIX = "V:"


class VuedaSearchFilterBackend(SearchFilter):
    """
    Custom search filter that supports trigram and word similarity. Use the prefix `#`
    to indicate that the search term in `search_fields` should use trigram
    similarity comparison, and `~` for word similarity. The similarity threshold can be set on the ViewSet
    as `similarity_threshold`.
    """

    customized_lookup_prefixes = {
        TRIGRAM_SIMILAR_PREFIX: "trigram_similar",
        TRIGRAM_WORD_SIMILAR_PREFIX: "trigram_word_similar",
        SEARCH_LOOKUP_PREFIX: "vueda_search",
    }
    lookup_prefixes = {
        **SearchFilter.lookup_prefixes,
        **customized_lookup_prefixes,
    }

    search_threshold = 0.2

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if "similarity_threshold" in kwargs:
            self.similarity_threshold = kwargs["similarity_threshold"]

    def construct_search(self, field_name, queryset):
        """
        Add our custom prefixes as 'aliases' to its related lookup.
        """
        for prefix, lookup in self.customized_lookup_prefixes.items():
            if field_name.startswith(prefix):
                field_name = field_name[len(prefix) :]
                return f"{field_name}__{lookup}"
        return super().construct_search(field_name, queryset)

    def filter_queryset(self, request, queryset, view):
        """
        Combines VUEDA-style ranked search (`V:`-prefixed fields), trigram similar (`#`-prefixed
        fields), and deterministic lookups (e.g., `^`, `=`). Ranked results are ordered by a
        unified 'combined_rank' annotation.

        1. Parse search fields and terms using DRF's SearchFilter behavior.
        2. Separate VUEDA-prefixed fields (ranked fields (`V:`) and trigram similar fields (`#`)) from standard deterministic lookups.
        3. For ranked fields: annotate rank components (full-text, trigram, word-boundary matches).
        4. For trigram similar fields: combine all terms into one and filter DRF-style (OR across fields).
        5. For deterministic lookups: filter (OR across fields, AND across terms) and boost rank.
        6. Filter on a minimum combined rank and optionally order by it.
        7. Remove duplicates if needed (e.g. for M2M).
        """
        # gather search fields & terms (DRF semantics)
        search_fields = self.get_search_fields(view, request)
        search_terms = self.get_search_terms(request)

        if not search_fields or not search_terms:
            return queryset

        # convert prefix shortcuts into long-form, including ours
        orm_lookups = [self.construct_search(str(field), queryset) for field in search_fields]

        # split out our VUEDA-prefixed lookups
        v_prefix = f"__{self.customized_lookup_prefixes[SEARCH_LOOKUP_PREFIX]}"
        trig_prefix = f"__{self.customized_lookup_prefixes[TRIGRAM_SIMILAR_PREFIX]}"
        trig_word_prefix = f"__{self.customized_lookup_prefixes[TRIGRAM_WORD_SIMILAR_PREFIX]}"

        v_lookups = [lookup for lookup in orm_lookups if lookup.endswith(v_prefix)]
        trig_lookups = [lookup for lookup in orm_lookups if lookup.endswith(trig_prefix)]
        trig_word_lookups = [lookup for lookup in orm_lookups if lookup.endswith(trig_word_prefix)]

        ranked_fields = [lookup[: -len(v_prefix)] for lookup in v_lookups]
        trigram_fields = [lookup[: -len(trig_prefix)] for lookup in trig_lookups]
        trigram_word_fields = [lookup[: -len(trig_word_prefix)] for lookup in trig_word_lookups]

        det_lookups = [
            lookup
            for lookup in orm_lookups
            if lookup not in v_lookups and lookup not in trig_lookups and lookup not in trig_word_lookups
        ]

        if not ranked_fields and not trigram_fields and not trigram_word_fields:
            # no custom lookups, defer to base class behavior for deterministic lookups
            return super().filter_queryset(request, queryset, view)

        annotations = {}

        # ranked search: full-text, trigram and iregex
        if ranked_fields:
            search_vector = SearchVector(*ranked_fields)
            search_query = SearchQuery(" ".join(search_terms))
            annotations["search_rank"] = SearchRank(search_vector, search_query)

            # trigram similarity on every <field, term> pair
            for i, term in enumerate(search_terms):
                for fld in ranked_fields:
                    annotations[f"{fld}_{i}_trg"] = TrigramSimilarity(fld, term)

            # whole-word iregex boost
            regex = r"(?:^|\y)(?:" + "|".join(map(re.escape, search_terms)) + r")(?:$|\y)"
            word_scores = [
                models.Case(
                    models.When(**{f"{fld}__iregex": regex}, then=models.Value(1)),
                    default=models.Value(0),
                    output_field=models.IntegerField(),
                )
                for fld in ranked_fields
            ]
            if len(word_scores) > 1:
                annotations["iregex_score"] = Greatest(*word_scores)
            else:
                annotations["iregex_score"] = word_scores[0]

        # trigram similar: combine all search terms into one and filter DRF-style (OR across fields)
        if trig_lookups or trig_word_lookups:
            combined_term = " ".join(search_terms)
            conditions = [models.Q(**{lookup: combined_term}) for lookup in trig_lookups + trig_word_lookups]
            queryset = queryset.filter(reduce(operator.or_, conditions))

        # deterministic filtering and artificial rank boost
        if det_lookups:
            per_term_groups = [
                reduce(operator.or_, [models.Q(**{lookup: term}) for lookup in det_lookups]) for term in search_terms
            ]
            queryset = queryset.filter(reduce(operator.and_, per_term_groups))

            det_scores = [
                models.Case(
                    models.When(**{lookup: term}, then=models.Value(10)),
                    default=models.Value(0),
                    output_field=models.IntegerField(),
                )
                for lookup in det_lookups
                for term in search_terms
            ]
            annotations["deterministic_score"] = reduce(operator.add, det_scores, models.Value(0))

        # strip custom prefixes so model opts.get_field doesn't choke
        search_fields = list(
            OrderedSet(search_fields)
            - OrderedSet(f"{SEARCH_LOOKUP_PREFIX}{f}" for f in ranked_fields)
            - OrderedSet(f"{TRIGRAM_SIMILAR_PREFIX}{f}" for f in trigram_fields)
            - OrderedSet(f"{TRIGRAM_WORD_SIMILAR_PREFIX}{f}" for f in trigram_word_fields)
            | OrderedSet(ranked_fields)
            | OrderedSet(trigram_fields)
            | OrderedSet(trigram_word_fields)
        )
        # De-dupe if necessary (for M2M or joins)
        # A combination of what is in drf and django.contrib.admin.
        # We can't use a base_queryset as drf does, because we would lose the ordering by ranking.
        mcd = self.must_call_distinct(queryset, search_fields)

        ordering = request.query_params.get(api_settings.ORDERING_PARAM)

        # final combined rank and ordering
        if annotations:
            # sum every numeric annotation into combined_rank
            annotations["combined_rank"] = reduce(operator.add, [models.F(k) for k in annotations])
            if mcd:
                if not ordering:
                    queryset = (
                        queryset.annotate(**annotations)
                        .order_by("-combined_rank", "pk")
                        .distinct("combined_rank", "pk")
                        .filter(combined_rank__gte=self.search_threshold)
                    )
                else:
                    # Get each item in ordering, so we can pass it into order by and distinct
                    ordering_items = [x.strip() for x in ordering.split(",")]
                    distinct_items = [x[1:] if x.startswith("-") else x for x in ordering_items]
                    queryset = (
                        queryset.annotate(**annotations)
                        .order_by(*ordering_items, "pk")
                        .distinct(*distinct_items, "pk")
                        .filter(combined_rank__gte=self.search_threshold)
                    )
            else:
                queryset = queryset.annotate(**annotations).filter(combined_rank__gte=self.search_threshold)
            if not ordering and not mcd:
                queryset = queryset.order_by("-combined_rank")

        if mcd and not annotations:
            queryset = queryset.distinct()

        return queryset


class ModelChoiceArrayFilter(BaseArrayInFilter, ModelChoiceFilter):
    pass
