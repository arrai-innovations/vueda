- **`Table` frame**:
    - `Table` renders a new root element, `data-slot="table-frame"`, around its scroll container. The new `Table.frame` theme key carries the card fill, radius, and hairline edge, so sticky header cells and highlighted rows no longer paint over the edge. `Table.container` keeps the scrolling and the sticky height cap.
      _If a theme override or patch sets the fill, radius, or edge on `Table.container`, move it to `Table.frame`. Attributes passed to `Table` now land on the frame._
