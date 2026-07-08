# Test Migration Management

## Do the following when changes are made to `makegroupmigrations.py`.

1. Temporarily add the four group apps to `LOCAL_APPS` in
   `server/tests/settings.py`:

    ```python
    LOCAL_APPS = [
        ...

        "tests.group_added.apps.GroupAddedConfig",
        "tests.group_changed.apps.GroupChangedConfig",
        "tests.group_changes_syncing.apps.GroupChangesSyncingConfig",
        "tests.group_deleted.apps.GroupDeletedConfig",
    ]
    ```

2. From `server/`, run `updategroupmigrations`.
3. Remove the group apps added in step 1.
4. Run the tests to verify everything works.
5. Fix any failing tests.
6. Commit the migration changes in the four group apps.

[!WARNING]
Never do this procedure with the following apps. Their tests require group migrations that are not updated.

- `group_updating`
- `group_updating_bad_migrations`
- `group_updating_no_migrations`

## Do the following when changes are made to `makeworkflowmigrations.py`.

1. Temporarily add the six workflow apps to `LOCAL_APPS` in
   `server/tests/settings.py`:

    ```python
    LOCAL_APPS = [
        ...

        "tests.workflow_added.apps.WorkflowAddedConfig",
        "tests.workflow_changed.apps.WorkflowChangedConfig",
        "tests.workflow_deleted.apps.WorkflowDeletedConfig",
        "tests.workflow_duplicates.apps.WorkflowDuplicatesConfig",
        "tests.workflow_initial_state.apps.WorkflowInitialStateConfig",
        "tests.workflow_multi.apps.WorkflowMultiConfig",
    ]
    ```

2. From `server/`, run `updateworkflowmigrations`:
3. Remove the workflow apps added in step 1.
4. Run the tests to verify everything works.
5. Fix any failing tests.
6. Commit the migration changes in the six workflow apps.

[!WARNING]
Never do this procedure with the following apps. Their tests require group migrations that are not updated.

- `workflow_updating`
- `workflow_updating_bad_migrations`
- `workflow_updating_no_migrations`
