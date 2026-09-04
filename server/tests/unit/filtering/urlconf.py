"""The URLconf body the `urls_*.py` modules beside this one share.

Each of those modules serves a single viewset alongside the `vueda.info` routes, and a test points
`settings.ROOT_URLCONF` at it. They differ only in the app the viewset belongs to, the route it is
registered under, and the viewset itself, so the shape lives here and each module is left as the
three values that make it different.

Each scenario still needs a module of its own: `ROOT_URLCONF` is looked up as a module path, and a
router derives a viewset's basename from its model, so registering the several `Product` ordering
viewsets together would leave every one of them answering to `product.product-list` with no way for
`reverse()` to pick between them.
"""

from django.urls import include
from django.urls import path

from vueda.core.routers import VuedaRouter


def viewset_urlpatterns(app_label, route, viewset):
    """`urlpatterns` serving one viewset under `routes/tests/<app_label>/<route>/`.

    The `vueda.info` routes are included alongside it, so a test can read the model-info metadata
    for the same viewset it is issuing list requests against.
    """
    router = VuedaRouter()
    router.register(route, viewset)

    return [
        path(
            "routes/",
            include(
                [
                    path(f"tests/{app_label}/", include(router.urls)),
                    path("", include("vueda.info.urls")),
                ]
            ),
        )
    ]
