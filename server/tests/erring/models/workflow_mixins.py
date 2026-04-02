# Models to use with info.

from django.db import models

from vueda.core.models import VuedaModel
from vueda.workflow.models import HasWorkflowModelMixin


# The following are used for these class names, so the names don't get to long:

# Mo - Model inherits HasWorkflowModelMixin
# Mx - Model doesn't inherit HasWorkflowModelMixin

# So - Serializer inherits HasWorkflowSerializerMixin
# Sx - Serializer doesn't inherit HasWorkflowSerializerMixin

# Vo - Viewset inherits HasWorkflowViewMixin
# Vx - Viewset doesn't inherit HasWorkflowViewMixin
# Vz - No Viewset

# Wo - Has Workflow
# Wx - No Workflow


class MoSoVoWo(HasWorkflowModelMixin, VuedaModel):
    name = models.CharField()


class MxSoVoWo(VuedaModel):
    name = models.CharField()


class MoSxVoWo(HasWorkflowModelMixin, VuedaModel):
    name = models.CharField()


class MxSxVoWo(VuedaModel):
    name = models.CharField()


class MoSoVxWo(HasWorkflowModelMixin, VuedaModel):
    name = models.CharField()


class MxSoVxWo(VuedaModel):
    name = models.CharField()


class MoSxVxWo(HasWorkflowModelMixin, VuedaModel):
    name = models.CharField()


class MxSxVxWo(VuedaModel):
    name = models.CharField()


class MoSoVzWo(HasWorkflowModelMixin, VuedaModel):
    name = models.CharField()


class MxSoVzWo(VuedaModel):
    name = models.CharField()


class MoSxVzWo(HasWorkflowModelMixin, VuedaModel):
    name = models.CharField()


class MxSxVzWo(VuedaModel):
    name = models.CharField()


class MoSoVoWx(HasWorkflowModelMixin, VuedaModel):
    name = models.CharField()


class MxSoVoWx(VuedaModel):
    name = models.CharField()


class MoSxVoWx(HasWorkflowModelMixin, VuedaModel):
    name = models.CharField()


class MxSxVoWx(VuedaModel):
    name = models.CharField()


class MoSoVxWx(HasWorkflowModelMixin, VuedaModel):
    name = models.CharField()


class MxSoVxWx(VuedaModel):
    name = models.CharField()


class MoSxVxWx(HasWorkflowModelMixin, VuedaModel):
    name = models.CharField()


class MxSxVxWx(VuedaModel):
    name = models.CharField()


class MoSoVzWx(HasWorkflowModelMixin, VuedaModel):
    name = models.CharField()


class MxSoVzWx(VuedaModel):
    name = models.CharField()


class MoSxVzWx(HasWorkflowModelMixin, VuedaModel):
    name = models.CharField()


class MxSxVzWx(VuedaModel):
    name = models.CharField()
