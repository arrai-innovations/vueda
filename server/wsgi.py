# This exists so you can load up the permissions and workflows overview views.
# A change

import os

from django.core.wsgi import get_wsgi_application


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tests.settings")

application = get_wsgi_application()
