---
title: Nested Write Compatibility
type: explanation
audience: integrator
status: draft
---

# Nested Write Compatibility

A {@term Nested Write} saves related objects from the parent's request body in the same request. {@api py:class:vueda.core.serializers.VuedaSerializer} inherits this from {@api py:class:vueda.core.serializers.FlexFieldsWriteableNestedSerializerMixin}, which combines drf-flex-fields2 with drf-writable-nested in one serializer. This page describes how that mixin reads a nested body, the order in which it writes rows, and when each validation runs. [Build Nested/Inlined Writes](../guides/nested-writable-inlines) gives the steps to set up a nested form.

## How the Mixin Is Composed

The mixin's bases, in order, are [drf-writable-nested: `UniqueFieldsMixin`]{@api ext:drf-writable-nested:drf_writable_nested.UniqueFieldsMixin}, [drf-flex-fields2: `FlexFieldsSerializerMixin`]{@api ext:drf-flex-fields2:rest_flex_fields2.serializers.FlexFieldsSerializerMixin}, [drf-writable-nested: `NestedCreateMixin`]{@api ext:drf-writable-nested:drf_writable_nested.NestedCreateMixin}, and [drf-writable-nested: `NestedUpdateMixin`]{@api ext:drf-writable-nested:drf_writable_nested.NestedUpdateMixin}. Any serializer built on `VuedaSerializer` accepts nested writes.

The mixin changes three things in these packages. [`to_internal_value`]{@api py:function:vueda.core.serializers.FlexFieldsWriteableNestedSerializerMixin.to_internal_value} prepares nested fields before the body is read. [`update`]{@api py:function:vueda.core.serializers.FlexFieldsWriteableNestedSerializerMixin.update} replaces the library's update sequence. The mixin also drops read-only relations, forward and reverse, from the rows that it writes. A create runs the library code unchanged.

Two kinds of relation take part in a nested write. A direct relation is a foreign key or one-to-one field on the parent model. A reverse relation holds rows that point at the parent: child rows with a foreign key to it, many-to-many links, and reverse one-to-one relations.

## Which Relations Accept Nested Data

A relation accepts a nested object when its serializer field is a nested serializer. The field is either declared that way on the serializer, or the request includes the relation's name in the `e` query parameter. For each name in `e`, `to_internal_value` swaps the primary key field for the relation's nested serializer before it reads the body. [Field and Expand Semantics](./field-and-expand-semantics#sparse-fields-and-expand-on-writes) describes how `f`, `om`, and `e` apply to a write, including the check that rejects an unpermitted `e` name before the body is validated.

The swap runs only on a serializer that is an instance of the view's serializer class. Query parameters reach only the root serializer. An expanded child receives the expand names below it from its parent, and never reads `e` from the request itself.

DRF does not give nested serializer fields their part of the submitted body. `to_internal_value` sets `initial_data` on each nested serializer field whose name appears in the body, so a nested serializer can read its raw input while it validates. A read-only field, a relation left as a primary key, and a relation that the body omits get no `initial_data`.

## Read-Only Relations

When the mixin collects relations to write, it drops each one whose serializer is a {@api py:class:vueda.core.serializers.VuedaReadonlySerializer} or {@api py:class:vueda.core.serializers.VuedaReadonlyListSerializer}. This applies to forward relations (a foreign key or one-to-one on the parent) and to reverse relations. These serializers mark a relation as display only. The mixin discards the data that the body sends for such a relation, without an error. The request succeeds and the parent saves, but the related rows do not change, and the parent keeps its stored foreign key.

## Write Order

A create writes rows in this order:

1. Each direct relation in the body is linked, created, or updated, so that the parent can store the related row's key.
2. The parent row is created.
3. Each reverse relation row in the body is created, updated, or linked, with its foreign key set to the new parent.

An update writes rows in this order:

1. Unique fields are checked, as [Unique Field Checks](#unique-field-checks) describes.
2. Each direct relation in the body is linked, created, or updated.
3. The parent row is saved.
4. Reverse relation rows that the body leaves out are removed.
5. Each reverse relation row in the body is updated, created, or linked.
6. The parent is reloaded with {@api ext:django:django.db.models.Model.refresh_from_db}.

A row in the body updates the existing row whose primary key it carries, under `pk` or the model's primary key name. For a reverse foreign key, reverse one-to-one, or generic relation, the server looks for that row only among the parent's own rows. A row whose primary key matches none of them, or that has no primary key, creates a new row. For a direct relation or a many-to-many relation, the server looks for the row among all rows of the related model. A primary key that matches no row there is a `400` error, and a row without a primary key creates a new row. [Related-Row Authorization](#related-row-authorization) describes the permission check for these rows.

Removal applies only to a reverse relation whose key is in the body. A body that omits the key leaves every row of that relation in place. A `PATCH` that sends the key must send the relation's full set of rows. What removal does depends on the relation:

- A many-to-many relation loses its link to the row. The row stays.
- A foreign key with {@api ext:django:django.db.models.SET_NULL} or `SET_DEFAULT` is set to null or to its default.
- Any other foreign key has its row deleted. When {@api ext:django:django.db.models.PROTECT} blocks the delete, the response is a `400` with "Cannot delete ... because protected relation exists" under `non_field_errors`.

The update removes rows before it writes the body's rows, which is the reverse of drf-writable-nested's order. When the body is HTML form data, DRF rebuilds the nested row list each time the serializer reads its submitted data. Form data is a form-encoded body or a multipart body without the manifest that [CRUD Adapter Layer](./crud-adapter-layer#multipart-saves) describes. The library records a new row's primary key in one copy of that list, and its removal step reads a fresh copy without it. Run in the library's order, the removal step would delete the rows that the request had just created.

After a create or an update, `VuedaSerializer` reads the saved row again when its model keeps {@term Model History}, so the response carries the row's [`object_revision`]{@api py:property:vueda.core.serializers.VuedaSerializer.object_revision}. A nested row saved by a `VuedaSerializer` child is read again the same way.

Each request runs in one database transaction ([Configuration Surface and Defaults](./configuration-surface-and-defaults#request-transactions)), and the serializer's `save()` runs in its own, as [Related-Row Authorization](#related-row-authorization) describes. A validation error raised partway through either sequence rolls back the rows written before it.

## Related-Row Authorization

A direct relation or a many-to-many relation can name a row that other parents also use, such as a customer that many invoices share. Before the mixin creates or updates such a row, it checks the related model's permissions. Rows of a reverse foreign key, reverse one-to-one, or generic relation belong to the parent, and the mixin does not check them separately.

The check uses the related model's viewset from the model registry, which {@api py:function:vueda.info.register} fills. The action is `create` for a row without a primary key and `update` for a row with one. The viewset receives a copy of the request with the method `POST` or `PUT` and the nested row as its data. It runs `check_permissions`.

For an update, the viewset then runs `get_object`, which finds the row through the viewset's queryset and runs `check_object_permissions`. Permission classes for each action, object rules, and workflow-state grants and denials therefore apply as they do for a direct request. The viewset's own `create` or `update` method does not run. The nested serializer validates and saves the row.

The mixin refuses the write in three cases: the serializer context has no request, the registry has no viewset for the related model, or that viewset has no method for the action. A model registered with only a serializer has no viewset. A refusal, including a row that the viewset's queryset leaves out, is a `400` under the relation's key. The message is "You do not have permission to update app_label.Model." or "Cannot establish update permission for app_label.Model." A new row gets `create` in place of `update`. A many-to-many relation holds one entry per row in body order.

A row that carries only its primary key, under `pk` or the model's primary key name, links an existing row and leaves it unchanged. The mixin finds the row through the related model's default manager. It skips the child serializer's validation and `save()`, and it runs no permission check. The row therefore needs none of the child's required fields, and no save hooks of the child serializer run. A primary key that matches no row is a `400` under the relation's key.

The serializer's `save()` runs inside {@api ext:django:django.db.transaction.atomic}. A refusal or validation error partway through the write rolls back every row saved before it. This includes the parent and its reverse relation rows. A save hook that calls an outside service is not undone by the rollback. Such a hook can defer the call with Django's `transaction.on_commit`.

[Build Nested/Inlined Writes](../guides/nested-writable-inlines#permissions-for-related-rows) shows the registration and a link payload.

## Save-Time Child Validation

Each nested row is validated twice. The first pass runs inside the parent's `is_valid()`, with the nested serializer field that the parent holds. The second pass runs during `save()`. For each row, the parent serializer builds a new instance of the child serializer class, validates that row's submitted data, and saves it. The new instance receives only the request context, the matched existing row, and the data. On a `PATCH`, an existing row is validated as a partial update, and a new row is validated in full. A direct or many-to-many row that carries only its primary key skips both passes, as [Related-Row Authorization](#related-row-authorization) describes.

The second pass explains two failures that appear after `is_valid()` has passed:

- The parent's foreign key reaches the child through `save()`, after validation. A child serializer that lists that foreign key as a required writable field fails with "This field is required." on each new row, and on every row of a `PUT`.
- The new instance validates against the child class's full field set. Options from the parent's `expandable_fields` entry, such as a `fields` restriction, and expand names below the child do not reach it.

The error is a `400` under the relation's key. A list relation holds one entry per row in body order, with an empty object for each row that passed, for example `{"invoice_lines": [{}, {"invoice": ["This field is required."]}]}`. [Error and Validation Contract](./error-and-validation-contract#non-field-and-nested-path-semantics) describes how the client turns these into field paths.

## Unique Field Checks

`UniqueFieldsMixin` removes each field's {@api ext:drf:rest_framework.validators.UniqueValidator} from field validation and runs it when the serializer saves. drf-writable-nested defers the check because a nested child has no row to compare against during the parent's validation, so an unchanged unique value would count as a duplicate.

For the parent, the check runs before any row is written. A create runs it through `UniqueFieldsMixin`. The mixin's `update` runs it as its first step, because it replaces the library's update. A duplicate value returns a `400` keyed by the field name.

A child serializer built on `VuedaSerializer` checks its unique fields when its own row saves. By then the parent and earlier rows in the body are written, and on an update the omitted rows are removed. A new row can therefore take a unique value that a removed row held in the same request.

The mixin moves only single-field unique validators. DRF's {@api ext:drf:rest_framework.validators.UniqueTogetherValidator} stays in validation and runs during `is_valid()`.
