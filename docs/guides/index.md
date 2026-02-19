---
audience: implementors
status: draft
type: index
---

# Guides

Guides are task-focused recipes for implementors working on real VUEDA projects. They assume you already know your domain model and need practical steps for wiring server + client behavior.

## Resource Modeling & CRUDL

- [Create a CRUDL Surface for a New Model](create-crudl-surface.md): Minimal server/client pieces for `list`/`read`/`create`/`update`/`delete`/`list`.
- [Split Read/Write Serializers Safely](split-read-write-serializers.md): Use viewset serializer switching without breaking model-info metadata.
- [Configure `list`/`read`/`create`/`update` Views](configure-crud-views.md): Tune model config per view, including default fields/expands/actions.
- [Expose Aggregates in `list` Responses](list-column-totals.md): Use server column totals and render them in `list` views.

## Fields, Forms, and Relationships

- [Model Choices, Lookup Fields, and Dynamic Options](choices-and-lookups.md): Use model-info choices and choice endpoints correctly.
- [Use Expand and Sparse Field Controls](expand-and-fields-controls.md): Control payload shape with `expand` and `fields`.
- [Build Nested/Inlined Writes](nested-writable-inlines.md): Handle writable nested relations and server validation behavior.
- [Customize Field and Widget Rendering](custom-field-widget-rendering.md): Override field/widget components and props in model config.
- [Handle Form Validation and Server Errors](form-validation-and-errors.md): Map server validation responses into VUEDA form context.

## Actions, Permissions, and Workflow

- [Control Action Availability in the UI](control-action-availability.md): Combine server action metadata, groups, and client filtering.
- [Implement Row-Level Permissions](implement-row-level-permissions.md): Add queryset/object checks and verify `list` filtering behavior.
- [Map Django and VUEDA Permission Names](permission-name-mapping.md): Configure and verify `PERMISSION_NAMES_MAPPING`.
- [Add Workflow State and Transition Permissions](workflow-state-permissions.md): Layer state-based grants/denies over CRUDL permissions.
- [Design Transition UX and Redirects](transition-ux-and-redirects.md): Integrate transitions with action routing and post-submit redirects.

## Async Work and Integrations

- [Run Actions in the VUEDA Dispatch Queue (VDQ)](vdq-actions.md): Queue long-running work and report status.
- [Send Email from VDQ with Anymail](vdq-email-anymail.md): Configure queue item email workflows and attachments.
- [Send SMS from VDQ with Twilio](vdq-sms-twilio.md): Configure SMS sender/receiver flow and retry semantics.
