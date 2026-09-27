---
title: Map Django and VUEDA Permission Names
type: how-to
audience: integrator
status: draft
---

# Map Django and VUEDA Permission Names

This guide sets the {@term Permission Mapping}, places the import that applies it, and checks that the generated codenames match the ones the server checks. [Permission Name Patch](../core-concepts/configuration-surface-and-defaults#permission-name-patch) describes what the import changes in Django.

Settle the mapping before the project's first `migrate`. Migration writes one {@api ext:django:django.contrib.auth.models.Permission} row per codename, and a later mapping change does not rename those rows.

## Choose a Mapping

`PERMISSION_NAMES_MAPPING` renames each action in a model's {@api ext:django:django.db.models.Options.default_permissions} when Django creates permission rows. VUEDA models declare `create`, `read`, `update`, `delete`, and `list` in [`default_permissions`]{@api py:property:vueda.core.models.BaseModelMeta.default_permissions}. Every other model gets `list` added to its defaults, unless its `Meta` declares its own `default_permissions`.

VUEDA's viewsets honour two kinds of mapping:

- **The default**, from {@api py:function:vueda.core.default_settings.get_defaults}. It maps `add` to `create`, `change` to `update`, and `view` to `read`. Use it for a new project.
- **Django's names.** It maps VUEDA's actions to `add`, `change`, and `view`. Use it for a database whose permission rows and group assignments already use Django's names.

[Permissions](../reference/permissions#permission-name-mapping) lists the values for both.

The two differ in what the viewsets check. {@api py:class:vueda.core.permissions.ObjectPermissions} checks `create_`, `read_`, `list_`, `update_`, and `delete_` codenames. Importing {@api py:module:vueda.core.patch_django} changes that for each mapping value that is `add`, `change`, or `view` and is not also a key. The import rewrites the matching entries of [`perms_map`]{@api py:property:vueda.core.permissions.ObjectPermissions.perms_map} to check that name.

::: warning
Map actions only to the default names or to `add`, `change`, and `view`. A mapping such as `"delete": "remove"` or `"list": "browse"` creates permission rows that `ObjectPermissions` never checks.
:::

Under Django's names, a `view` value makes every `GET` on a viewset require the `view_` codename, for both list and detail. Map `list` to `view` as well, so that [row-level list filtering]{@api py:function:vueda.core.permissions.filter_rows_for_user} and the choice endpoints check the same codename as the viewset.

## Set Mapping and Patch Import Order

1. To use Django's names, set `PERMISSION_NAMES_MAPPING` in your base settings module, after the `get_defaults` call. For the default mapping, skip this step.

2. Import `patch_django` at the end of each leaf settings module, the module that `DJANGO_SETTINGS_MODULE` names. The VUEDA project template does this in `config/settings/local.py`:

    ```python
    # Import patch_django in the leaf settings file (not base.py) so that
    # PERMISSION_NAMES_MAPPING is fully resolved before the import triggers a lookup.
    # If you override PERMISSION_NAMES_MAPPING above, place this import after that override.
    from vueda.core import patch_django  # noqa: F401
    ```

    The template has only `local.py`. Add the same import to every other leaf module you create, such as production or test settings. VUEDA does not import `patch_django` for you.

3. Run `python manage.py migrate`.

The import reads the mapping once to decide the `perms_map` rewrite, so a later change to the setting does not reach `ObjectPermissions`. This includes {@api ext:django:django.test.override_settings} in tests. Codename generation, row-level list filtering, the choice endpoints, and {@api py:class:vueda.core.permissions.DynamicObjectPermissions} read the mapping when they run.

## Check the Generated Codenames

List a model's codenames from `python manage.py shell`:

```python
from django.contrib.auth.models import Permission

Permission.objects.filter(content_type__app_label="myapp", content_type__model="widget").values_list(
    "codename", flat=True
)
```

For `myapp.Widget`, expect these rows:

| Mapping        | Codenames                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| Default        | `myapp.create_widget`, `myapp.read_widget`, `myapp.update_widget`, `myapp.delete_widget`, `myapp.list_widget` |
| Django's names | `myapp.add_widget`, `myapp.view_widget`, `myapp.change_widget`, `myapp.delete_widget`                         |

Under Django's names, `read` and `list` both map to `view`, so the model has one `view_widget` row. Django's own models get the same set, for example `auth.list_group` under the default mapping.

## Check Runtime Permission Checks

Give a test user one permission at a time and send each request. The table uses the default names; substitute your mapped names.

| Request                                                                                                                 | Required permission                                                          | Result                                  |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| `GET` list                                                                                                              | `myapp.list_widget`                                                          | `200` if held, `403` if not             |
| `GET` detail                                                                                                            | `myapp.read_widget`                                                          | `200` if held, `403` if not             |
| `POST`                                                                                                                  | `myapp.create_widget`                                                        | `201` if held, `403` if not             |
| `PUT` or `PATCH`                                                                                                        | `myapp.update_widget`                                                        | `200` if held, `403` if not             |
| `DELETE`                                                                                                                | `myapp.delete_widget`                                                        | `204` if held, `403` if not             |
| [Field choices]{@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}                     | `myapp.read_widget`, plus `list_` on the related model for a relation        | `200` if all held, `403` if any missing |
| [Filter choices]{@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}             | `myapp.read_widget`, plus `list_` on the related model for a queryset filter | `200` if all held, `403` if any missing |
| [Workflow state history]{@api rest:endpoint:GET:/workflow-state-history/{app_label}/{model}/{object_id}/}               | `myapp.read_widget`                                                          | `200` if held, `403` if not             |
| [Workflow object state]{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-state/{object_id}/} | `myapp.read_widget`                                                          | `200` if held, `403` if not             |

Under Django's names, the `GET` list and `GET` detail rows both require `myapp.view_widget`. VUEDA's own tests use the default mapping, so add these checks to your project's tests if you use Django's names.

## Troubleshooting

**Django and third-party models refuse every request.** Their rows use `add_`, `change_`, and `view_`, and they have no `list_` row. The leaf settings module in use does not import `patch_django`. VUEDA models are unaffected, because they declare CRUD action names. Check the settings module that each entry point uses: the server, the test runner, and `manage.py`.

**A renamed action has rows but no effect.** The mapping names a value other than the default names or `add`, `change`, and `view`. See [Choose a Mapping](#choose-a-mapping).

**List access cannot be granted without detail access.** A `view` mapping makes list and detail require the same codename.

**A mapping change has no effect on existing grants.** The next `migrate` adds rows under the new names. The old rows, the groups that hold them, and any {@term Group Permission Migration} that names them keep the old codenames. Move those assignments to the new rows yourself.

**Project code checks the wrong codename.** A literal codename, such as `user.has_perm("myapp.read_widget")`, does not follow the mapping. Update these strings when you change the mapping.
