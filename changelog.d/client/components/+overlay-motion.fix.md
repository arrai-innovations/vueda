- **Overlay and accordion motion**:
    - `base.css` now imports `tw-animate-css`, which the client package lists as a runtime dependency. Dialogs, sheets, drawers, popovers, hover cards, menus, select and combobox lists, tooltips, and the accordion use its enter, exit, and expand utilities, which consumer builds did not compile before.
      _If your stylesheet imports `tw-animate-css` itself for these components, remove that import._
