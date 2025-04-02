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
        if type_name.endswith("Field"):
            type_name = type_name[:-5]

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


class VuedaFilterSet(IdInFilterSet, rest_framework.FilterSet):
    pass


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
        Copying the original filter_queryset; if you use the new vueda search method,
        we take over the filtering process to include ordering, if not otherwise specified.
        """
        # *** original code start
        search_fields = self.get_search_fields(view, request)
        search_terms = self.get_search_terms(request)

        if not search_fields or not search_terms:
            return queryset

        orm_lookups = [self.construct_search(str(search_field), queryset) for search_field in search_fields]
        base = queryset
        # /*** original code end

        my_fake_lookup = f"__{self.customized_lookup_prefixes[SEARCH_LOOKUP_PREFIX]}"
        # Identify which lookups we should handle. our field prefixes are not converted to orm_lookups
        handled_lookups = [field for field in orm_lookups if field.endswith(my_fake_lookup)]
        handled_fields = [field[: -len(my_fake_lookup)] for field in handled_lookups]

        if not handled_fields:
            return super().filter_queryset(request, queryset, view)

        annotations = {}
        if handled_lookups:
            # let's get annotated scores for:
            # 1. SearchRank, SearchQuery, SearchVector to full text search against all the fields requested
            # 2. TrigramSimilarity to do similarity search against all the fields requested
            # 3. `iregex`, with a boolean 'score' if any of the fields contains any search term as a whole word
            # 4. Combine all the scores to a single score, and filter the queryset based on the threshold
            # 5. Order the queryset by the combined score

            search_vector = SearchVector(*handled_fields)
            search_query = SearchQuery(" ".join(search_terms))
            search_rank = SearchRank(search_vector, search_query)
            annotations["search_rank"] = search_rank

            for index, search_term in enumerate(search_terms):
                for field in handled_fields:
                    annotations[f"{field}_{index}_trigram_similarity"] = TrigramSimilarity(field, search_term)

            regex_patterns = [re.escape(term) for term in search_terms]
            # postgres regular expression, not python
            # \y is a word boundary
            regex_pattern = r"(?:^|\y)(?:" + "|".join(regex_patterns) + r")(?:$|\y)"

            if len(handled_fields) > 1:
                annotations["iregex_score"] = Greatest(
                    *[
                        models.Case(
                            models.When(**{f"{field}__iregex": regex_pattern, "then": models.Value(1)}),
                            default=models.Value(0),
                            output_field=models.IntegerField(),
                        )
                        for field in handled_fields
                    ]
                )
            else:
                field = handled_fields[0]
                annotations["iregex_score"] = models.Case(
                    models.When(**{f"{field}__iregex": regex_pattern, "then": models.Value(1)}),
                    default=models.Value(0),
                    output_field=models.IntegerField(),
                )

            annotations["combined_rank"] = reduce(operator.add, [models.F(key) for key in annotations])

            queryset = queryset.annotate(**annotations).filter(combined_rank__gte=self.search_threshold)
            if not request.query_params.get(api_settings.ORDERING_PARAM):
                # user did not request a specific ordering, so we order by the combined rank
                queryset = queryset.order_by("-combined_rank")

            # remove the similarity annotations, so they don't interfere with the rest of the queryset
            orm_lookups = [field for field in orm_lookups if field not in handled_lookups]

            # remove the prefixes on search fields, if the field was handled, so must_call_distinct works correctly
            # it only works on standard django lookups
            search_fields = list(
                OrderedSet(search_fields) - OrderedSet(f"{SEARCH_LOOKUP_PREFIX}{field}" for field in handled_fields)
                | OrderedSet(handled_fields)
            )

        if orm_lookups:
            # there may not be non vueda search conditions
            # *** original code start (indented)
            # generator which for each term builds the corresponding search
            conditions = (
                reduce(operator.or_, (models.Q(**{orm_lookup: term}) for orm_lookup in orm_lookups))
                for term in search_terms
            )
            queryset = queryset.filter(reduce(operator.and_, conditions))

        # Remove duplicates from results, if necessary
        mcd = self.must_call_distinct(queryset, search_fields)
        if mcd:
            # inspired by django.contrib.admin
            # this is more accurate than .distinct form M2M relationship
            # also is cross-database
            queryset = queryset.filter(pk=models.OuterRef("pk"))
            queryset = base.filter(models.Exists(queryset))
        return queryset
        # /*** original code end
