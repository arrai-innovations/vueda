---
audience: integrator
status: draft
type: index
---

# Guides

Guides give the steps for one task each, such as adding a model's CRUD surface, granting workflow permissions, or restyling a component. They assume you know your domain model, Django, Django REST framework, and Vue ([What you need to know](../tutorials/start-building#what-you-need-to-know)). The [Core Concepts](../core-concepts/) pages explain the rules that the steps rely on.

## Environment & Networking

- [Configure the Cache and Sessions](configure-cache-and-sessions.md): Choose a cache backend for `CACHE_URL`, keep sessions readable across worker processes, and verify the result.
- [Local HTTPS Development](local-https-setup.md): Serve the Django server and Vite over HTTPS with an mkcert certificate, so that local cookies behave as they do in production.

## Client Setup & Theming

- [Client Plugin Prerequisites](client-plugin-prerequisites.md): Set up the client files that the built-in views need: dependencies, Vite config, stylesheet, theme, icons, CRUD adapters, and the toaster.
- [Customize VUEDA Appearance](customize-vueda-appearance.md): Recipes for each customization scope: one instance, one component, a visual family, and brand tokens.
- [Style Unovis Charts](style-unovis-charts.md): Add the optional stylesheet that maps Unovis charts to VUEDA's typography, surfaces, and dark mode.
- [Place the Page Title and Page Actions](place-page-title-and-actions.md): Set up the page title context in your layout, supply titles and actions from views, pin the header while the page scrolls, and build a custom title display.

## Authentication

- [Build Auth Views](build-auth-views.md): Route the shipped sign-in, two-factor, and password views, add the forgot and reset password flow, and build your own auth forms.

## Resource Modeling & CRUD

- [Create a CRUD Surface for a New Model](create-crud-surface.md): Add the REST endpoints, model-info registration, client routes, and permissions that give a model working `list`, `create`, `read`, `update`, and `delete` views.
- [Set Up CRUD for a Composite Primary Key Model](composite-primary-keys.md): Set up the model, serializer, filterset, viewset, and routes for a model whose rows use a composite primary key.
- [Expose a Proxy Model as a Separate CRUD Surface](proxy-models.md): Give a proxy model its own serializer, viewset, permissions, and model-info registration on its concrete model's table.
- [Split Read/Write Serializers Safely](split-read-write-serializers.md): Serialize reads and writes with separate serializers on one viewset, and keep the default views working.
- [Lock Fields to Specific Write Actions](hide-fields-per-write-action.md): Make named fields read-only on `create` or `update` with {@api py:class:vueda.core.serializers.ExcludeFieldsSerializerMixin}, without a full serializer split.
- [Configure `list`/`read`/`create`/`update` Views](configure-crud-views.md): Change one view's fields, actions, redirect after a save, and list controls through {@term Model Config} overrides.
- [Link List Rows to Read and Update Views](link-list-rows-to-detail-views.md): Turn one `list` column into a link to each row's `read` or `update` view.
- [Declare List Ordering](declare-list-ordering.md): Set a default order that model info reports, place nulls, and sort or filter by a related `formatted_name`.
- [Open a Scoped List](scope-a-list.md): Narrow a `list` view through a hidden-filter link or a declared `params` scope, and let the user clear it.
- [Customize List Column Rendering](customize-list-column-rendering.md): Change the component or props that render a `list` column's cells, or write your own column adapter.
- [Expose Aggregates in `list` Responses](list-column-totals.md): Declare column totals on a viewset and show them in the footer row of the `list` view.

## Fields, Forms, and Relationships

- [Choice-Backed Fields and Lookup Models](choices-and-lookups.md): Give a field a set of options, build a widget that loads them, and declare a `Lookup` model.
- [Use Expand and Sparse Field Controls](expand-and-fields-controls.md): Declare expandable relations, permit them per action, and select the fields of expanded objects.
- [Customize Model Info Field and Expand Metadata](customize-model-info-metadata.md): Correct a generated `model_fields` or `model_expands` entry that does not match what the field returns.
- [Build Nested/Inlined Writes](nested-writable-inlines.md): Save a parent and its related objects in one request, and customize the inline rows that edit them.
- [Customize Field and Widget Rendering](custom-field-widget-rendering.md): Replace the component that renders a form or filter field, change its props, or write your own widget.
- [Handle Form Validation and Server Errors](form-validation-and-errors.md): Show server validation errors on form fields, clear them when the user edits, and block submission on local errors.
- [Require Confirmation Before a Write](require-write-confirmation.md): Return warnings from the server and confirm them in the client before the write runs.

## Actions, Permissions, and Workflow

- [Control Action Availability in the UI](control-action-availability.md): Shape the action lists that the server reports, and narrow the actions that the client offers.
- [Implement Row-Level Permissions](implement-row-level-permissions.md): Add queryset and object checks, and test them, so that each user sees and changes only the rows that your rules allow.
- [Map Django and VUEDA Permission Names](permission-name-mapping.md): Set the permission mapping before the first `migrate`, and check that the generated codenames match the ones that the server checks.
- [Add Workflow State and Transition Permissions](workflow-state-permissions.md): Control who can take each transition, and grant or deny {@term CRUD} permissions by an object's workflow state.
- [Design Transition UX and Redirects](transition-ux-and-redirects.md): Run a workflow transition from an action form, and choose the view that the form opens after a submit or cancel.
- [Manage Workflows and Generate Workflow Migrations](manage-workflows.md): Create, edit, and delete workflows through the UI, then capture those changes as a replayable migration.
- [Manage Groups and Generate Group Migrations](manage-groups.md): Add groups to permissions, rename groups, and remove permissions from groups through the UI, then capture those changes as a replayable migration.
- [Use the Permissions and Workflow Overview](permissions-workflow-overview.md): Audit which groups hold each permission and workflow permission, and check what one user holds.

## Model History

- [Purge Model History Rows](purge-model-history.md): Delete history event rows older than a cutoff that you choose, while the trigger that blocks deletes is suspended.

## Async Work and Integrations

- [Run Actions in the VUEDA Dispatch Queue (VDQ)](vdq-actions.md): Route the VDQ API, run the worker, create senders and receivers, grant permissions, and retry, cancel, or resend queue items.
- [Send Email from VDQ with Anymail](vdq-email-anymail.md): Configure the Anymail backend, the provider's tracking webhook, and attachments, and see how provider events set each queue item's state.
- [Send SMS from VDQ with Twilio](vdq-sms-twilio.md): Configure Twilio credentials, delivery status by webhook or polling, and the Celery beat schedule that checks status.
