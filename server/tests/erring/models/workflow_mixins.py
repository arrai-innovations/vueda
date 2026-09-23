# Models to use with info.

from django.db import models

from vueda.core.models import VuedaModel


# The following are used for these class names, so the names don't get to long:

# Mo - Model enables class Vueda.Workflow
# Mx - Model doesn't enable class Vueda.Workflow

# So - Serializer inherits HasWorkflowSerializerMixin
# Sx - Serializer doesn't inherit HasWorkflowSerializerMixin

# Vo - Viewset inherits HasWorkflowViewMixin
# Vx - Viewset doesn't inherit HasWorkflowViewMixin
# Vz - No Viewset

# Wo - Has Workflow
# Wx - No Workflow


class MoSoVoWo(VuedaModel):
    name = models.CharField()

    class Vueda:
        class Workflow:
            enabled = True


class MxSoVoWo(VuedaModel):
    name = models.CharField()


class MoSxVoWo(VuedaModel):
    name = models.CharField()

    class Vueda:
        class Workflow:
            enabled = True


class MxSxVoWo(VuedaModel):
    name = models.CharField()


class MoSoVxWo(VuedaModel):
    name = models.CharField()

    class Vueda:
        class Workflow:
            enabled = True


class MxSoVxWo(VuedaModel):
    name = models.CharField()


class MoSxVxWo(VuedaModel):
    name = models.CharField()

    class Vueda:
        class Workflow:
            enabled = True


class MxSxVxWo(VuedaModel):
    name = models.CharField()


class MoSoVzWo(VuedaModel):
    name = models.CharField()

    class Vueda:
        class Workflow:
            enabled = True


class MxSoVzWo(VuedaModel):
    name = models.CharField()


class MoSxVzWo(VuedaModel):
    name = models.CharField()

    class Vueda:
        class Workflow:
            enabled = True


class MxSxVzWo(VuedaModel):
    name = models.CharField()


class MoSoVoWx(VuedaModel):
    name = models.CharField()

    class Vueda:
        class Workflow:
            enabled = True


class MxSoVoWx(VuedaModel):
    name = models.CharField()


class MoSxVoWx(VuedaModel):
    name = models.CharField()

    class Vueda:
        class Workflow:
            enabled = True


class MxSxVoWx(VuedaModel):
    name = models.CharField()


class MoSoVxWx(VuedaModel):
    name = models.CharField()

    class Vueda:
        class Workflow:
            enabled = True


class MxSoVxWx(VuedaModel):
    name = models.CharField()


class MoSxVxWx(VuedaModel):
    name = models.CharField()

    class Vueda:
        class Workflow:
            enabled = True


class MxSxVxWx(VuedaModel):
    name = models.CharField()


class MoSoVzWx(VuedaModel):
    name = models.CharField()

    class Vueda:
        class Workflow:
            enabled = True


class MxSoVzWx(VuedaModel):
    name = models.CharField()


class MoSxVzWx(VuedaModel):
    name = models.CharField()

    class Vueda:
        class Workflow:
            enabled = True


class MxSxVzWx(VuedaModel):
    name = models.CharField()
