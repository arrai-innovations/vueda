from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response

from vueda.core.serializers import WhoAmISerializer


class WhoAmIView(RetrieveAPIView):
    serializer_class = WhoAmISerializer
    permission_classes = []

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if isinstance(instance, AnonymousUser):
            return Response({}, status=200)
        return super().retrieve(request, *args, **kwargs)

    def get_object(self):
        if self.request.user.pk:
            return get_user_model()
        return self.request.user
