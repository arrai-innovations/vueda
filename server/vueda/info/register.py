from copy import deepcopy


_registry = {}


def register(content_type, canonical_viewset, canonical_serializer):
    """
    Register a model so that it can be used with ModelInformationViewSet.

    :param content_type: The content_type to register.
    :param canonical_viewset: The viewset to use as a reference for the model.
    :param canonical_serializer: The serializer to use as a reference for the model.
    """
    if content_type.pk in _registry:
        raise ValueError(f"ContentType {content_type} is already registered.")
    _registry[content_type.pk] = {
        "viewset": canonical_viewset,
        "serializer": canonical_serializer,
    }


def get_registration(content_type):
    """
    Get the registration for a content type.

    :param content_type: The content type to get the registration for.
    :return: The registration for the content type.
    """
    # this deepcopy is defensive to prevent inadvertent modification of the registry
    return deepcopy(_registry[content_type])


def get_all_registrations():
    """
    Get all the registrations.

    :return: All the registrations.
    """
    # this deepcopy is defensive to prevent inadvertent modification of the registry
    return deepcopy(_registry)


def get_registered_content_types():
    """
    Get all the registered content types.

    :return: All the registered content types.
    """
    return _registry.keys()
