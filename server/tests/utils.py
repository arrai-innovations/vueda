import os
from contextlib import contextmanager

from django.http import QueryDict


def clean_migrations(which_app=None):
    workflow_added_migrations_data = {
        "tests/workflow_added/migrations": (
            "__init__.py",
            "0001_initial.py",
            "0002_create_workflow_added_workflow.py",
        ),
    }
    workflow_changed_migrations_data = {
        "tests/workflow_changed/migrations": (
            "__init__.py",
            "0001_initial.py",
            "0002_create_workflow_changed_permissions.py",
            "0003_workflow_migrations_2024_05_14.py",
            "0004_change_workflow.py",
        ),
    }
    workflow_deleted_migrations_data = {
        "tests/workflow_deleted/migrations": (
            "__init__.py",
            "0001_initial.py",
            "0002_create_workflow_deleted_permissions.py",
            "0003_workflow_migrations_2024_05_13.py",
            "0004_delete_workflow.py",
        ),
    }
    workflow_duplicates_migrations_data = {
        "tests/workflow_duplicates/migrations": (
            "__init__.py",
            "0001_initial.py",
            "0002_workflow_migrations_2025_07_07.py",
            "0003_create_state_history_records.py",
        ),
    }
    workflow_multi_migrations_data = {
        "tests/workflow_multi/migrations": (
            "__init__.py",
            "0001_initial.py",
            "0002_create_workflow_and_history.py",
        ),
    }
    match which_app:
        case "workflow_added":
            existing_migration_data = workflow_added_migrations_data

        case "workflow_changed":
            existing_migration_data = workflow_changed_migrations_data

        case "workflow_deleted":
            existing_migration_data = workflow_deleted_migrations_data

        case "workflow_duplicates":
            existing_migration_data = workflow_duplicates_migrations_data

        case "workflow_multi":
            existing_migration_data = workflow_multi_migrations_data

        case _:
            existing_migration_data = {}
            existing_migration_data.update(workflow_added_migrations_data)
            existing_migration_data.update(workflow_changed_migrations_data)
            existing_migration_data.update(workflow_deleted_migrations_data)
            existing_migration_data.update(workflow_duplicates_migrations_data)
            existing_migration_data.update(workflow_multi_migrations_data)

    for path, existing_migrations in existing_migration_data.items():
        for root, _dirs, files in os.walk(path):
            for filename in files:
                if filename not in existing_migrations:
                    os.remove(os.path.join(root, filename))


class FakeRequest:
    def __init__(self, query_params=None, data=None, method="GET", user=None):
        if query_params is None:
            query_params = {}

        # GET
        # a dictionary-like class customized to deal with multiple values for the same key
        self.query_params = QueryDict("", mutable=True)

        for key, value in query_params.items():
            self.query_params.setlist(key, [value] if isinstance(value, str) else value)
        # POST, PUT, PATCH
        self.data = data
        self.method = method
        self.user = user


class FakeView:
    def __init__(
        self,
        request,
        serializer_class,
        action=None,
        queryset=None,
        allowed_extra_actions=frozenset(("current", "history-list")),
    ):
        self.request = request
        self.serializer_class = serializer_class
        self.action = action
        self.queryset = queryset
        self.allowed_extra_actions = allowed_extra_actions

    def get_serializer_class(self):
        return self.serializer_class

    def get_queryset(self):
        if callable(self.queryset):
            return self.queryset()
        return self.queryset

    def get_allowed_extra_actions(self, request, *, instance=None):
        return set(self.allowed_extra_actions)


# Because rest framework loads settings on class import there's no way to
# override through 'settings', but we will do it regardless, to be thorough.
@contextmanager
def adjust_page_size(settings, value):
    orig_value = settings.REST_FRAMEWORK["PAGE_SIZE"]
    settings.REST_FRAMEWORK["PAGE_SIZE"] = value
    try:
        yield
    finally:
        settings.REST_FRAMEWORK["PAGE_SIZE"] = orig_value
