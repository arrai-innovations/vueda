---
title: Add Workflow to a Model
audience: implementors
status: draft
type: tutorial
---

# Add Workflow to a Model

In this tutorial, you will add workflow support to an existing VUEDA model. By the end, your model will track state, support transitions via the API, and provide a debug admin UI for managing workflow definitions during development.

Now that your VUEDA project is set up with basic functionality, it's time to add workflow features. The following steps build directly on the foundational work you've completed, using the Product model as an example.

## What Workflow Adds

A workflow gives your model named states and transitions. Each model instance tracks its current state. Transitions define valid state changes. The API provides endpoints for querying state, listing transitions, and executing transitions. Add state and transition permissions for extra access control if needed.

Without a workflow, a model's CRUDL views work normally but lack state-driven behaviour. When the client requests `permitted_transitions` from the API, it receives a 404 if workflow URLs are not wired up. Likewise, the UI displays transition actions that appear empty if no workflow exists for the model. Wiring up workflow URLs eliminates the 404, while creating a workflow definition populates the transitions.

## Wire Up Workflow URLs

`vueda.workflow` is in `INSTALLED_APPS` by default, and its migrations run during the initial `migrate`. Add URL routing to finish the setup.

The copier templates wire up `vueda.info` and `vueda.user` URLs but do not include `vueda.workflow`. Add it to your project's `config/urls.py`:

```python
from django.urls import include, path

from vueda.info.urls import urlpatterns as vueda_info_urls
from vueda.user.urls import urlpatterns as vueda_user_urls
from vueda.workflow.urls import urlpatterns as vueda_workflow_urls  # [!code ++]

urlpatterns = [
    path(
        "routes/",
        include(
            [
                path("", include(vueda_info_urls)),
                path("", include(vueda_user_urls)),
                path("", include(vueda_workflow_urls)),  # [!code ++]
                path("", include("your_project.urls")),
            ]
        ),
    ),
]
```

This registers two sets of endpoints under the `routes/` prefix:

- **API endpoints** at `routes/vueda.workflow/workflows/{app_label}/{model}/...` for querying state, listing transitions, and executing transitions.
- **Debug admin views** (only when `DEBUG=True`) at `routes/vueda.workflow/overview/`, `routes/vueda.workflow/add/`, and `routes/vueda.workflow/edit/{pk}/` for managing workflow definitions through a browser UI.

After registering the URLs, restart your server to apply the changes.

## Add the Workflow Mixin to Your Model

To use workflow, add `HasWorkflowModelMixin` to your model. This mixin creates an `ObjectState` record on save, tracks state, and offers methods to query or execute transitions.

Update your model in `server/your_project/inventory/models.py`:

```python
from django.db import models

from vueda.core.models import BaseModelMeta, Lookup, VuedaModel
from vueda.workflow.models import HasWorkflowModelMixin  # [!code ++]


class Product(HasWorkflowModelMixin, VuedaModel):  # [!code ++]
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=64, unique=True)
    description = models.TextField(blank=True)

    class Meta(BaseModelMeta):
        ordering = ["name", "id"]
```

Place `HasWorkflowModelMixin` before `VuedaModel` in the inheritance list so its `save()` override runs first.

Once the mixin is added, you can proceed without new migrations. The mixin is abstract and does not add database columns; it uses the existing `ObjectState` table (from `vueda.workflow` migrations) to track per-instance state via a generic relation.

## Create a Workflow Definition

A workflow definition consists of:

- A **Workflow** object, linked to a content type (one workflow per model).
- **State** objects belonging to the workflow.
- An **InitialState** object, designating which state new instances receive on first save.
- **Transition** objects, each with a target state and one or more **TransitionSource** entries that define valid source states.

Choose how you want to create your workflow definition. The following options cater to different development needs.

### Option A: Debug Admin UI

When `DEBUG=True`, go to `http://localhost:8000/routes/vueda.workflow/overview/` in your browser. Log in as a superuser if needed. This page lists workflows and flags models that implement `HasWorkflowModelMixin` but have no workflow definition.

1. On the overview page, click **Add** to start a new workflow. Choose the content type for your model (for example, `inventory | product`). Enter a code and a descriptive name for the workflow, then save it.
2. After creating the workflow, go to its edit page. Click **Add State** to define each state your model should support (for example, `draft` and `published`). Save each state as you add it.
3. Set the initial state by selecting one of your defined states (such as `draft`) to be the default for new objects, then save this selection.
4. Click **Add Transition** to define transitions between states. For example, create a `publish` transition that moves from `draft` to `published`. Then, create an `unpublish` transition that moves from `published` back to `draft`. For each transition, specify both a target state and at least one valid source state.

The workflow activates immediately. New `Product` instances are now saved with the initial state. The API reports available transitions.

### Option B: Django Shell

```python
from django.contrib.contenttypes.models import ContentType
from vueda.workflow.models import (
    InitialState,
    State,
    Transition,
    TransitionSource,
    Workflow,
)

ct = ContentType.objects.get_for_model(Product)

workflow = Workflow.objects.create(
    code="product",
    name="Product Workflow",
    content_type=ct,
)

draft = State.objects.create(workflow=workflow, code="draft", name="Draft")
published = State.objects.create(workflow=workflow, code="published", name="Published")

InitialState.objects.create(workflow=workflow, state=draft)

publish = Transition.objects.create(
    workflow=workflow, code="publish", name="Publish", target=published
)
TransitionSource.objects.create(transition=publish, source=draft)

unpublish = Transition.objects.create(
    workflow=workflow, code="unpublish", name="Unpublish", target=draft
)
TransitionSource.objects.create(transition=unpublish, source=published)
```

### Option C: Data Migrations

To version workflow definitions, use the `makeworkflowmigrations` command. It scans workflow history and creates a Django migration to manage workflow objects.

1. Create or modify workflow objects with the debug admin UI or shell.
2. Run `python manage.py makeworkflowmigrations` to generate a migration.
3. Commit the migration. Other developers and CI apply it with `migrate`.

With this approach, your project's workflow definitions stay consistent across environments.

## Verify the API

With the workflow wired up, verify that the API returns the correct response. Using the same authentication setup from [Start Building](start-building.md):

```console
# Check permitted transitions for Product
curl -b $COOKIE_JAR \
  http://localhost:8000/routes/vueda.workflow/workflows/inventory/product/permitted_transitions/
# Expect: 200 with a list of transition codes (e.g. [{"code": "publish", "name": "Publish"}, ...])
```

If you have existing `Product` instances created before the workflow was added, they will not yet have an `ObjectState` record. Re-saving them (or calling `product.create_object_state()`) assigns the initial state.

For a specific object, check its current state and available transitions:

```console
# Object state
curl -b $COOKIE_JAR \
  http://localhost:8000/routes/vueda.workflow/workflows/inventory/product/object-state/1/

# Transitions available for this object in its current state
curl -b $COOKIE_JAR \
  http://localhost:8000/routes/vueda.workflow/workflows/inventory/product/object-transitions/1/
```

Execute a transition:

```console
curl -b $COOKIE_JAR -c $COOKIE_JAR \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -X PATCH \
  http://localhost:8000/routes/vueda.workflow/workflows/inventory/product/execute-transition/1/ \
  -d '{"transition_code": "publish"}'
# Expect: 200 with {"new_state": {"code": "published", ...}, "new_transitions": [...]}
```

## Verify in the Browser

If you have the client running, navigate to the read or update view of a `Product` instance. The client's action router automatically queries `permitted_transitions` and `object_transitions`. If the workflow is configured and the user has appropriate permissions, transition actions (such as "Publish") appear alongside the standard CRUDL actions.

## What's Next

You now have a workflow with states and transitions. The API only allows valid transitions, and the client shows available transitions in the UI.

To add permission-based control over who can see or execute transitions, and to grant or deny CRUDL permissions based on an object's current state, see the workflow permission guides.
