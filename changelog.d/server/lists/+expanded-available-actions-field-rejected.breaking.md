- **Requests reject `available_actions` on an expanded object (`?f=`)**:
    - An expanded object never includes `available_actions`, but `?e=distributor&f=distributor.available_actions` passed field validation and returned `"distributor": {}`. That request now returns the usual "Invalid field" 400, and the list of valid fields in that error no longer names `<expand>.available_actions`. A top-level `available_actions` is unchanged.
      _Remove `<expand>.available_actions` from any `?f=` your client sends; it never returned data._
