# Changelog

## v2.0.0-alpha.1 (2025-04-10)

### Breaking Changes

- **`useForm`/`useField`/`useWidget` Composables Overhaul** ([64bf77a](https://github.com/arrai-innovations/vueda-client/commit/64bf77aadc4777634547440cab74a01097aa4371))
    - `updateInitialValue()` removed, which violated idiomatic Vue 3 patterns. ("props down, events up")
    - `blur()` no longer clears server errors automatically. If your validation workflows depended on that behavior, manually call `formContext.clearServerErrors(fieldName, dependents)`
    - `reset()` on `useForm` now skips error clearing on initial call.
    - `contextless` mode improved for `useField` and added for `useWidget`, to emulate a parent for holding state.
- **Router View Mappings**
    - `"retrieve"` → `"read"` in `routerComponent.js`. In client code, this helps differentiate between the view and the action.
- **Peer Dependency Upgrades**
    - Consumers should ensure their project dependencies align with the updated peer ranges to avoid resolution conflicts.
    - Major version bumps to peer deps
        - `pinia` `^2.2.6` → `^3.0.1`
        - `@vueuse/core` `^12.4.0` → `^13.0.0`
        - `@sentry/vue` `^7.53.1` → `^9.5.0`
        - `@arrai-innovations/reactive-helpers` `^17.0.2` → `^18.0.0`
    - Other version bumps to peer deps
        - `vue` `^3.4.0` → `^3.5.13`
- **Renamed**
    - Moved `@vueda/use/useActionMap` to `@vueda/utils/actionMap`, as it contains no composable function.

---

### Features

- `useFilteredAttrs` now supports `Set` for it's `pickList` and `omitList` props.

---

### Fixes

- Prefer direct lodash-es imports, so that there is a canonical source for tree-shaking, enforced by eslint rule `import/no-restricted-paths`.
- Prefer `Array.isArray()` over lodash-es `isArray` for type narrowing that WebStorm/Typescript can understand.
- `useLinkModelView`
    - Clarify `requiresPK` and `actionDisabled` logic
- `useModelChoices`, `useModelConfig`, `useModelInfo`, `useFilteredActions`:
    - Stores now lazy-loaded to avoid premature Pinia init in SSR/Vite.
    - Removed nested `ref` of `ref` patterns, where reactivity was not working as hoped for. Replaced with smartly timed `toRef` use.
    - Avoid `isRef` checks for args by directly assigning to an internal `reactive` state, which handles refs or literals.
- `useFilteredActions`:
    - `groups` uses a `computed` to ensure reactivity when loggedInUser is reassigned.
- Use the new pinia `defineStore([id:string], {})` signature, over `defineStore({[id:string]:string, ...}`, as now required.
