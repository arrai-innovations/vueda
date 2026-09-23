"""Focused unit tests for the dotted/ORM path translation helpers.

Every caller of these functions (``VuedaOrderingFilter``, ``PublicFilterAliasMixin``,
``model_ordering``/``model_filtering`` metadata) is already covered by HTTP-level tests elsewhere,
but that only ever exercises the helpers with realistic, well-formed paths. These tests isolate each
function against its edge cases -- an empty path, a bare direction marker, repeated separators, and
the wildcard grammar -- without a request or a database to carry them.
"""

import pytest

from vueda.core.paths import join_ordering_direction
from vueda.core.paths import orm_filter_path_to_public
from vueda.core.paths import orm_ordering_path_to_public
from vueda.core.paths import public_ordering_path_to_orm
from vueda.core.paths import reject_wildcard
from vueda.core.paths import split_ordering_direction


class TestSplitOrderingDirection:
    @pytest.mark.parametrize(
        ("term", "expected"),
        [
            ("employee.name", (False, "employee.name")),
            ("-employee.name", (True, "employee.name")),
            ("", (False, "")),
            ("-", (True, "")),
            ("--employee.name", (True, "-employee.name")),
        ],
    )
    def test_splits_the_leading_direction_marker_from_the_path(self, term, expected):
        assert split_ordering_direction(term) == expected


class TestJoinOrderingDirection:
    @pytest.mark.parametrize(
        ("descending", "path", "expected"),
        [
            (False, "employee.name", "employee.name"),
            (True, "employee.name", "-employee.name"),
            (False, "", ""),
            (True, "", "-"),
        ],
    )
    def test_joins_the_direction_marker_ahead_of_the_path(self, descending, path, expected):
        assert join_ordering_direction(descending, path) == expected

    @pytest.mark.parametrize("term", ["employee.name", "-employee.name", "", "-", "-employee.name.formatted"])
    def test_round_trips_through_split_ordering_direction(self, term):
        descending, path = split_ordering_direction(term)
        assert join_ordering_direction(descending, path) == term


class TestPublicOrderingPathToOrm:
    @pytest.mark.parametrize(
        ("path", "expected"),
        [
            ("employee.name", "employee__name"),
            ("employee.user.name", "employee__user__name"),
            ("name", "name"),
            ("", ""),
            ("employee..name", "employee____name"),
        ],
    )
    def test_translates_dots_to_the_orm_lookup_separator(self, path, expected):
        assert public_ordering_path_to_orm(path) == expected


class TestOrmOrderingPathToPublic:
    @pytest.mark.parametrize(
        ("path", "expected"),
        [
            ("employee__name", "employee.name"),
            ("employee__user__name", "employee.user.name"),
            ("name", "name"),
            ("", ""),
            ("employee____name", "employee..name"),
        ],
    )
    def test_translates_the_orm_lookup_separator_to_dots(self, path, expected):
        assert orm_ordering_path_to_public(path) == expected

    @pytest.mark.parametrize("path", ["employee__name", "employee__user__name", "name", ""])
    def test_round_trips_through_public_ordering_path_to_orm(self, path):
        assert public_ordering_path_to_orm(orm_ordering_path_to_public(path)) == path


class TestOrmFilterPathToPublic:
    """Same ``__`` -> ``.`` mechanics as the ordering translation, exercised as its own function --
    the module deliberately gives each parameter grammar its own name rather than sharing one generic
    converter, so a caller reads which grammar it is translating from the function it calls, not from
    a shared implementation the two happen to agree on today."""

    @pytest.mark.parametrize(
        ("path", "expected"),
        [
            ("customer__formatted_name", "customer.formatted_name"),
            ("customer__formatted_name__icontains", "customer.formatted_name.icontains"),
            ("distributor__id", "distributor.id"),
            ("distributor", "distributor"),
            ("", ""),
        ],
    )
    def test_translates_a_declared_filter_name_to_its_public_form(self, path, expected):
        assert orm_filter_path_to_public(path) == expected


class TestRejectWildcard:
    @pytest.mark.parametrize("path", ["*", "foo.*", "*.foo", "foo.*.bar", "*foo"])
    def test_raises_on_any_path_carrying_the_wildcard_segment(self, path):
        with pytest.raises(ValueError, match="wildcards are only permitted"):
            reject_wildcard(path)

    @pytest.mark.parametrize("path", ["foo", "foo.bar", "", "foo.bar.baz"])
    def test_does_not_raise_on_a_path_with_no_wildcard(self, path):
        reject_wildcard(path)
