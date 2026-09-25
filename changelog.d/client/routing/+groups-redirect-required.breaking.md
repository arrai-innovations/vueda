- **`makeCRUDRoutes` requires `groupsRedirect` when `groups` names a group**:
    - With `groups` set and no `groupsRedirect`, the groups guard redirected to `null` when it denied a user. A production build threw a `TypeError` and aborted the navigation. `makeCRUDRoutes` now throws when it builds the routes instead. An empty `groups` list still needs no redirect.
      _Pass `groupsRedirect`, for example `{ name: "denied" }`, wherever you pass a non-empty `groups`._
