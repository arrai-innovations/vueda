# Models to use with info.

from django.db import models

from vueda.core.models import VuedaModel


# Whether a model takes part in workflow depends on two things only: whether it enables
# class Vueda.Workflow, and whether a workflow definition (a Workflow row) exists for it. These
# models cover each combination. Migration 0002 creates the workflows for the two "WithWorkflow"
# models.


class EnabledWithWorkflow(VuedaModel):
    """Enables class Vueda.Workflow and has a workflow definition: a working workflow model."""

    name = models.CharField()

    class Vueda:
        class Workflow:
            enabled = True


class EnabledWithoutWorkflow(VuedaModel):
    """Enables class Vueda.Workflow but has no workflow definition: misconfigured."""

    name = models.CharField()

    class Vueda:
        class Workflow:
            enabled = True


class NotEnabledWithWorkflow(VuedaModel):
    """Has a workflow definition but does not enable class Vueda.Workflow, so the row is ignored."""

    name = models.CharField()


class NotEnabledWithoutWorkflow(VuedaModel):
    """Neither enables class Vueda.Workflow nor has a workflow definition."""

    name = models.CharField()
