"""``RowLevelPermissions.check_queryset_workflow`` as ``filter_rows_for_user`` applies it.

The hook runs after the workflow state rules, on a queryset annotated with whether a state rule
denies or grants each row. Its return value narrows that queryset, empties it, or leaves it alone.
"""

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q

from tests.store import models as store_models
from vueda.core.permissions import BaseRowLevelPermissions
from vueda.core.permissions import filter_rows_for_user
from vueda.workflow.models import State
from vueda.workflow.models import StatePermission
from vueda.workflow.models import Workflow


@pytest.mark.django_db(databases=("default", "db_logging"))
class TestCheckQuerysetWorkflow:
    @pytest.fixture
    def group(self):
        group, _ = Group.objects.get_or_create(name="Row level workflow group")
        group.permissions.clear()
        return group

    @pytest.fixture
    def content_type(self):
        return ContentType.objects.get_for_model(store_models.CustomerOrder)

    @pytest.fixture
    def user(self, group, content_type):
        user = get_user_model().objects.create_user(
            email="row-level-workflow@domain.invalid",
            name="Row Level Workflow User",
            password="password",
        )
        user.groups.add(group)
        user.user_permissions.add(*Permission.objects.filter(content_type=content_type))
        return user

    @pytest.fixture
    def orders(self, user):
        customer = store_models.Customer.objects.create(user=user)
        order_state, _ = store_models.OrderState.objects.get_or_create(code="new", defaults={"name": "New"})
        return [
            store_models.CustomerOrder.objects.create(
                order_number=Decimal(number),
                customer=customer,
                order_state=order_state,
                shipping_method="free",
            )
            for number in ("19201", "19202")
        ]

    @pytest.fixture
    def workflow(self, orders):
        workflow = Workflow.objects.get(content_type=orders[0].get_content_type())
        # The store fixtures ship state rules of their own. Clearing them lets each test state the
        # rules it means to exercise.
        StatePermission.objects.filter(state__workflow=workflow).delete()
        return workflow

    @pytest.fixture
    def hook(self, monkeypatch):
        """Installs a ``check_queryset_workflow`` that records its call and returns ``result``."""
        calls = []

        def install(result):
            class RowLevelPermissions(BaseRowLevelPermissions):
                @classmethod
                def check_queryset_workflow(cls, queryset, perm, user, perm_type, denied, granted):
                    calls.append({"perm": perm, "perm_type": perm_type, "denied": denied, "granted": granted})
                    return result(denied, granted) if callable(result) else result

            monkeypatch.setattr(store_models.CustomerOrder, "RowLevelPermissions", RowLevelPermissions, raising=False)
            return calls

        return install

    @staticmethod
    def visible(user):
        return set(filter_rows_for_user(store_models.CustomerOrder.objects.all(), user).values_list("pk", flat=True))

    @pytest.mark.parametrize("result", [None, True])
    def test_no_opinion_keeps_the_state_filtered_rows(self, hook, user, orders, workflow, result):
        hook(result)

        assert self.visible(user) == {order.pk for order in orders}

    def test_a_q_narrows_the_rows(self, hook, user, orders, workflow):
        hook(Q(pk=orders[0].pk))

        assert self.visible(user) == {orders[0].pk}

    def test_false_empties_the_queryset(self, hook, user, orders, workflow):
        hook(False)

        assert self.visible(user) == set()

    def test_the_hook_receives_the_state_annotation_names(self, hook, user, orders, workflow):
        calls = hook(None)

        self.visible(user)

        assert calls == [
            {
                "perm": "store.list_customerorder",
                "perm_type": "list",
                "denied": "_state_denied",
                "granted": "_state_granted",
            }
        ]

    def test_a_q_over_the_grant_annotation_keeps_only_granted_states(
        self, hook, user, group, content_type, orders, workflow
    ):
        orders[1].update_object_state(State.objects.get(workflow=workflow, code="packed"))
        StatePermission.objects.create(
            state=State.objects.get(workflow=workflow, code="new"),
            permission=Permission.objects.get(content_type=content_type, codename="list_customerorder"),
            group=group,
            grant_or_deny=True,
        )
        hook(lambda denied, granted: Q(**{granted: True}))

        assert self.visible(user) == {orders[0].pk}

    def test_a_state_deny_applies_before_the_hook(self, hook, user, group, content_type, orders, workflow):
        StatePermission.objects.create(
            state=State.objects.get(workflow=workflow, code="new"),
            permission=Permission.objects.get(content_type=content_type, codename="list_customerorder"),
            group=group,
            grant_or_deny=False,
        )
        hook(True)

        assert self.visible(user) == set()


@pytest.mark.django_db(databases=("default", "db_logging"))
class TestSuperuserStateRules:
    """A superuser sees in a list every row ``has_perm`` lets them read on its own."""

    def test_a_state_deny_on_the_superusers_group_hides_no_rows(self):
        group, _ = Group.objects.get_or_create(name="Superuser state deny group")
        superuser = get_user_model().objects.create_user(
            email="superuser-state-deny@domain.invalid",
            name="Superuser State Deny",
            password="password",
            is_superuser=True,
        )
        superuser.groups.add(group)
        customer = store_models.Customer.objects.create(user=superuser)
        order_state, _ = store_models.OrderState.objects.get_or_create(code="new", defaults={"name": "New"})
        order = store_models.CustomerOrder.objects.create(
            order_number=Decimal("19301"),
            customer=customer,
            order_state=order_state,
            shipping_method="free",
        )
        workflow = Workflow.objects.get(content_type=order.get_content_type())
        StatePermission.objects.filter(state__workflow=workflow).delete()
        StatePermission.objects.create(
            state=State.objects.get(workflow=workflow, code="new"),
            permission=Permission.objects.get(content_type=order.get_content_type(), codename="list_customerorder"),
            group=group,
            grant_or_deny=False,
        )

        visible = filter_rows_for_user(store_models.CustomerOrder.objects.all(), superuser)

        assert superuser.has_perm("store.list_customerorder", obj=order)
        assert order.pk in set(visible.values_list("pk", flat=True))
