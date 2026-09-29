---
title: Add Workflow to a Model
audience: integrator
status: draft
type: tutorial
---

# Add Workflow to a Model

In this tutorial, we add a {@term Workflow} to the `Product` model from [Start Building](start-building.md). A product starts as a draft, and a `publish` transition moves it to published. By the end, the API reports each product's state and executes transitions, and the client shows transition buttons.

We work as the Start Building user, `you@example.com`. Its group grants the `inventory` permissions, and we add a second group for the workflow.

## Wire Up Workflow URLs

{@api py:module:vueda.workflow} is in {@api ext:django:setting:INSTALLED_APPS} by default, and its migrations ran with your first `migrate`. The project templates route the `vueda.info` and `vueda.user` URLs but leave out `vueda.workflow`. Add the [workflow URL patterns]{@api py:module:vueda.workflow.urls} to `server/config/urls.py`:

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

This adds the workflow API under `routes/vueda.workflow/workflows/<app_label>/<model>/`. While {@api ext:django:setting:DEBUG} is on, it also adds the workflow management views under `routes/vueda.workflow/`.

## Enable Workflow on the Model

In `server/your_project/inventory/models.py`, add `class Vueda` with a `Workflow` class to `Product`:

```python
class Product(VuedaModel):
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=64, unique=True)
    description = models.TextField(blank=True)

    class Vueda:  # [!code ++]
        class Workflow:  # [!code ++]
            enabled = True  # [!code ++]

    class Meta(BaseModelMeta):
        ordering = ["name", "id"]
```

`Product` is now a {@term Workflow-Enabled Model}. VUEDA gives each product an {@term Object State} record when it is saved. The product serializer and filterset gain the workflow fields and the [`workflow_state` filter]{@api py:class:vueda.core.filters.WorkflowStateFilterSetMixin}. The model needs no new migration, because object states live in a `vueda.workflow` table.

Until the model has a workflow definition, saving a `Product` raises {@api py:class:vueda.workflow.exceptions.WorkflowNotConfiguredError}. We create the definition next.

## Create the Workflow Definition

A workflow definition has four parts:

- A {@api py:class:vueda.workflow.models.Workflow} linked to the model's {@term Content Type}. Each model has at most one.
- {@api py:class:vueda.workflow.models.State} rows, here `draft` and `published`.
- An {@api py:class:vueda.workflow.models.InitialState}, the state a new object receives on its first save.
- {@api py:class:vueda.workflow.models.Transition} rows. Each has a target state and one or more {@api py:class:vueda.workflow.models.TransitionSource} rows naming the states it leaves from.

From `server/`, open a Django shell:

```console
uv run python manage.py shell
```

Create the workflow, its two states, the initial state, and two transitions:

```python
from django.contrib.contenttypes.models import ContentType
from vueda.workflow.models import (
    InitialState,
    State,
    Transition,
    TransitionSource,
    Workflow,
)

from your_project.inventory.models import Product

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

Keep the shell open for the next step.

The Starter Kit product from Start Building has no object state yet, because we saved it before the workflow existed. In a second terminal, from `server/`, give it the initial state with {@api py:class:vueda.workflow.management.commands.backfillworkflowstates.Command}:

```console
uv run python manage.py backfillworkflowstates inventory.Product
# Expect: inventory.Product: created 1 object state(s).
```

## Grant Workflow Permissions

Until the workflow has a {@term Workflow Permission}, no user can list or execute its transitions. A transition with no {@term Transition Permission} is hidden from every user. [Workflow as a Permission Overlay](../core-concepts/workflow-permission-overlay.md) explains both gates.

In the same shell, create one workflow permission and one permission per transition. Then grant them to a group, and add our user to it:

```python
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from vueda.workflow.models import TransitionPermission, WorkflowPermission

read_product = Permission.objects.get(content_type=ct, codename="read_product")
update_product = Permission.objects.get(content_type=ct, codename="update_product")
read_workflow = Permission.objects.get(
    content_type__app_label="vueda_workflow", codename="read_workflow"
)

# Users need inventory.read_product to use this workflow.
WorkflowPermission.objects.create(workflow=workflow, permission=read_product)

# Users need inventory.update_product to take each transition.
for transition in workflow.transitions.all():
    TransitionPermission.objects.create(transition=transition, permission=update_product)

editors, _ = Group.objects.get_or_create(name="Product Editors")
editors.permissions.add(read_workflow, read_product, update_product)
get_user_model().objects.get(email="you@example.com").groups.add(editors)
```

The transition endpoints also check `vueda_workflow.read_workflow`, so the group grants it. The group also grants the two `inventory` permissions the rows name, so it holds everything this workflow needs.

## Verify the API

Log in with curl as in [Start Building](start-building.md#verify-the-new-api-endpoints), so `$COOKIE_JAR` and `$CSRF_TOKEN` are set. Then request the model's {@term Permitted Transitions}:

```console
curl -b $COOKIE_JAR \
  http://localhost:8000/routes/vueda.workflow/workflows/inventory/product/permitted_transitions/
# Expect: 200 with [{"code": "publish", "name": "Publish"}, {"code": "unpublish", "name": "Unpublish"}]
```

Create a product. It starts in the `draft` state.

```console
curl -b $COOKIE_JAR -c $COOKIE_JAR \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -X POST http://localhost:8000/routes/inventory/product/ \
  -d '{"name":"Workflow Kit","sku":"WORKFLOW-001"}'
# Expect: 201 with the created object
PRODUCT_ID=3  # replace with the "id" from the response
```

Read the product's [state]{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-state/{object_id}/} and the [transitions it can take]{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-transitions/{object_id}/} from that state:

```console
curl -b $COOKIE_JAR \
  http://localhost:8000/routes/vueda.workflow/workflows/inventory/product/object-state/$PRODUCT_ID/
# Expect: 200 with {"state": {"code": "draft", "name": "Draft"}, ...}

curl -b $COOKIE_JAR \
  http://localhost:8000/routes/vueda.workflow/workflows/inventory/product/object-transitions/$PRODUCT_ID/
# Expect: 200 with [{"code": "publish", "name": "Publish"}]
```

[Execute]{@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/{object_id}/} the `publish` transition by sending its code as `transition_code`:

```console
curl -b $COOKIE_JAR -c $COOKIE_JAR \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -X PATCH \
  http://localhost:8000/routes/vueda.workflow/workflows/inventory/product/execute-transition/$PRODUCT_ID/ \
  -d '{"transition_code": "publish"}'
# Expect: 200 with {"new_state": {"code": "published", ...}, "new_transitions": [{"code": "unpublish", "name": "Unpublish"}]}
```

The product is now published, and `unpublish` is the one transition it can take.

## Verify in the Browser

With the client running, log in as `you@example.com` and reload the page, so the client reads the new permissions. Open the read view of the Starter Kit product. A **Publish** button appears beside the standard {@term CRUD} actions. On the Workflow Kit product, which we published, the button reads **Unpublish**.

The list view builds its transition buttons from the model's permitted transitions, and a detail view builds them from the object's {@term Valid Transitions}. [Action Contract and Availability](../core-concepts/action-contract-and-availability.md#ui-affordance-filtering-layers) describes where each view's buttons come from.

## What's Next

- [Manage Workflows and Generate Workflow Migrations](../guides/manage-workflows.md) describes building a workflow in the workflow management views and shipping it to other environments as a {@term Workflow Migration}.
- [Add Workflow State and Transition Permissions](../guides/workflow-state-permissions.md) adds {@term State Permission} rules that grant or deny {@term CRUD} permissions by state.
- [Workflow as a Permission Overlay](../core-concepts/workflow-permission-overlay.md) explains how the workflow, transition, and state gates combine.
