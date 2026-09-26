- **`girdType` slot prop removed (`ObjectsGridCardCell` `header`, `ObjectsGridTableHeader` `label`)**:
    - The misspelled prop named the component that rendered the slot. `isTableLayout` and `isCardLayout` carry the same information.
      _If a slot reads `girdType`, read `isTableLayout` or `isCardLayout` instead._
