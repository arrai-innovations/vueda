# Server tests

This page explains how the server test suite keeps tests apart, and which fixtures and markers a
new test needs. [CONTRIBUTING.md](../../CONTRIBUTING.md#make-a-change) walks through a whole
change. The root [README](../../README.md#server-test-database) covers the PostgreSQL setup.

Run the suite with `just test-server` from the repository root. CI runs it on two pytest-xdist
workers (see `.circleci/server.yml`). Run it the same way before you open a pull request:

```console
just test-server -n2 --dist loadgroup
```

## Test databases

pytest-django creates one test database for the session, or one for each xdist worker.
`suffix_each_test` in `conftest.py` then decides which database each test uses, based on the test's
markers.

### Shared database, rolled back

A test marked `django_db` runs inside a transaction in the shared test database. pytest-django
rolls the transaction back after the test, so the test leaves no rows behind. Most tests run this
way.

The transaction never commits. A second database connection cannot see the rows that the test
writes.

### A copy for each transactional or async test

Each test marked `django_db(transaction=True)` gets its own database. So does each `async def`
test. `suffix_each_test` creates the database as a copy of the test database through the
`TEST_POSTGRES_DB` maintenance connection. It drops the copy after the test. The copy's name is the
test database's name plus a hash of the test function's name.

Use a transactional test when the code under test must commit, or when a second connection must
see the test's rows. `test_send_message_sends_after_a_holder_updates_the_row` in
`unit/vdq/test_row_lock_contention.py` is an example. It holds a row lock from a second connection
in another thread.

Dropping the copy removes everything the test wrote. For that reason, `conftest.py` turns off the
table flush that Django runs after a transactional test (`TransactionTestCase._fixture_teardown`).

### A lean copy for tests that run `migrate`

A transactional test that also carries the `lean_database` marker gets a copy of a smaller
template. That template has every migration applied except the migrations of the test apps (the
apps under `server/tests/`). The exception is `tests.employee`. It holds `AUTH_USER_MODEL`, and
VUEDA's own migrations depend on it. The test apps stay installed, so their models import, but
their tables do not exist.

Running `migrate` gets slower as more migrations are applied, because Django replays the model state
of every applied migration. Give the marker to a test that runs `migrate` itself when both of these
statements hold:

- The test reads no test app tables other than those of `tests.employee`, apart from tables that
  its own `migrate` call creates.
- No migration that the test applies depends on another test app's migrations.

`test_the_vdq_migrations_still_reverse_and_apply` in
`unit/workflow/test_reverse_workflow_object_states.py` is an example. The group migration tests in
`unit/users/test_management_commands.py` do not use the marker. The migration that
`makegroupmigrations` generates depends on the latest migration of every project app, test apps
included.

Each xdist worker builds the template the first time a marked test needs it. The worker drops the
template when the session ends. `suffix_each_test` fails a marked test that is not also marked
`django_db(transaction=True)`.

## Tests that generate or apply migrations

Commands such as `makegroupmigrations` and `makeworkflowmigrations` write migration files. A test
of those commands must not write into the source tree. `BaseTestMigrations` and the helpers in
`tests/utils.py` handle this:

1. Change `MIGRATION_MODULES` and other settings through the pytest `settings` fixture, not
   `override_settings`. The fixture restores each setting after the test.
2. Install a test-only app with `append_installed_apps(settings, "tests.<app>")`. Changing
   `INSTALLED_APPS` reruns every app's `ready()`, which registers VUEDA's own serializers again.
   Decorate the test with `clear_info_registry_before_test()` so that second registration lands in
   an empty registry.
3. Run the commands inside `self.temporary_migration_module(settings, app_label=...)`. The context
   manager copies the app's migrations into a temporary directory and points `MIGRATION_MODULES` at
   the copy. It returns the copy's path, so the test can read the files that a command writes. It
   deletes the directory when the block exits.

`test_no_app_label_specified` in `unit/workflow/test_management_commands.py` follows all three
steps. To find a generated migration by name, use `find_one_migration_generated_today_or_fail`.
The commands put the date in the file name, and the helper accepts yesterday's date for a test that
runs past midnight.

## Tests that must not run in parallel

CI passes `-n2 --dist loadgroup` to pytest. Two workers run tests at the same time, and each worker
is one Python process. A test that changes state for the whole process can break a test on the
same worker that runs later. Examples of that state are class attributes, registries, loaded
migration modules, and `sys.modules`. Two such tests on different workers can also race on the
database objects that they share.

Tests that share a named `xdist_group` all run on one worker, one after another:

```python
@pytest.mark.xdist_group(name="management_command_tests")
```

Today the only group is `management_command_tests`. It holds the tests in
`unit/users/test_management_commands.py` and `unit/workflow/test_management_commands.py`. Add a
new test to that group when it installs one of their test apps, or changes the state that they
rely on. Then run the suite with `-n2 --dist loadgroup` to check that the group holds.

## Test conventions

- Change settings with the pytest `settings` fixture, not `override_settings`.
- Use `domain.invalid` for email addresses.
- Use `+1800555` followed by `0100` to `0199` for phone numbers.
- Test viewset behavior with real requests through the `api_client` fixture.
  `test_get_queryset_limits_to_authenticated_user` in `unit/users/test_viewsets.py` is an example.

## Regenerate the test apps' migrations

The group and workflow test apps commit the migrations that the management commands generated for
them. Regenerate them when a command's output changes.

### Do the following when changes are made to `makegroupmigrations.py`.

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

### Do the following when changes are made to `makeworkflowmigrations.py`.

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
