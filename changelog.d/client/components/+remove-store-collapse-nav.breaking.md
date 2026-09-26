- **`storeCollapseNav` removed**:
    - Nothing in VUEDA read this store. `SidebarProvider` keeps the sidebar's open state in a cookie instead.
      _If code imports `@vueda/stores/storeCollapseNav.js`, keep the collapsed state in application code or bind `SidebarProvider`'s `v-model:open`._
