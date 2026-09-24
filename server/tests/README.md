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

1. Temporarily add the five workflow apps to `LOCAL_APPS` in
   `server/tests/settings.py`:

    ```python
    LOCAL_APPS = [
        ...

        "tests.workflow_added.apps.WorkflowAddedConfig",
        "tests.workflow_changed.apps.WorkflowChangedConfig",
        "tests.workflow_deleted.apps.WorkflowDeletedConfig",
        "tests.workflow_duplicates.apps.WorkflowDuplicatesConfig",
        "tests.workflow_initial_state.apps.WorkflowInitialStateConfig",
    ]
    ```

2. From `server/`, run `updateworkflowmigrations`:
3. Remove the workflow apps added in step 1.
4. Run the tests to verify everything works.
5. Fix any failing tests.
6. Commit the migration changes in the five workflow apps.

[!WARNING]
Never do this procedure with the following apps. Their tests require group migrations that are not updated.

- `workflow_updating`
- `workflow_updating_bad_migrations`
- `workflow_updating_no_migrations`

Three apps are not part of this procedure and have nothing to add to step 1:

- `workflow_reused_codes` and `workflow_moved_codes` commit no generated migration. Their tests
  generate each one while running, because the dates a generated migration records only line up with
  history on the database that produced them.
- `workflow_received_codes` commits a generated migration written in the import form, so it holds no
  copied functions for this procedure to refresh. Its test applies that migration rather than faking
  it, which is what a database receiving one does, and rewriting it would change what the test reads.
