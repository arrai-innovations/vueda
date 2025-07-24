# VUEDA Server Development Guide

## Commands

-   **Build**: `pipenv install --dev` (setup), `python -m build` (package)
-   **Lint**: `ruff check .` (check), `ruff check --fix .` (fix)
-   **Format**: `ruff format .`
-   **Test**: `pytest` (all), `pytest tests/path/to/test_file.py::TestClass::test_method` (single test)
-   **Coverage**: `pytest --cov-config=.coveragerc && coverage combine && coverage html`
-   **Django**: `python manage.py test`, `python manage.py makemigrations`, `python manage.py migrate`
-   **API docs**: `python manage.py spectacular --color --file schema.yml`
-   **Workflow migrations**: `python manage.py makeworkflowmigrations` (after workflow changes)

## Architecture

-   **Core**: Django + DRF library that provides backend for vueda-client Vue.js components
-   **Companion**: vueda-client (../../WebstormProjects/vueda-client) - Vue 3 component library consuming this API
-   **Main modules**: `vueda/core/` (base classes), `vueda/user/` (auth), `vueda/workflow/` (state management), `vueda/history/` (audit), `vueda/info/` (meta-API)
-   **Database**: PostgreSQL with advanced features (arrays, GIN indexes, ranges)
-   **Base classes**: VuedaSerializer, VuedaViewSet, VuedaBaseModel with shared functionality
-   **Testing**: Django test framework in `tests/` with store examples
-   **Permission system**: Custom workflow-based permissions with row-level access control

## Code Style

-   **Line length**: 120 chars (ruff enforced)
-   **Imports**: Force single-line (isort), known first-party: vueda, tests
-   **Types**: Python 3.11+ with Django 5.2, no strict typing enforced
-   **Naming**: snake_case variables/functions, PascalCase classes, use DRF/Django conventions
-   **Models**: Inherit from VuedaBaseModel/ActivatableBaseModel, use custom managers
-   **Serializers**: Extend VuedaSerializer with flex-fields and validation mixins
-   **ViewSets**: Extend VuedaViewSet with atomic transactions and custom actions
-   **Error handling**: Use DRF ValidationError, custom permission classes
-   **API design**: RESTful endpoints with expandable fields, filtering, and workflow integration

## Integration Notes

-   **Frontend**: Changes to serializers/viewsets may affect vueda-client components
-   **Permissions**: Row-level permissions map to frontend component visibility
-   **Workflow**: State changes trigger frontend UI updates via API responses
-   **Meta-API**: `/info/` endpoints provide model metadata for dynamic frontend forms

## Commit Message Style

We use a custom commitlint configuration based on [Conventional Commits](https://www.conventionalcommits.org/). It is customized to have the following valid types:

```
build, ci, chore, content, docs, feat, fix, perf, refactor, remove, revert, style, test, wip
```

**Example**:

```
fix(UserSerializer): correct password validation logic
```

The scope should reference the affected filename (sans extension), module, or concern.
