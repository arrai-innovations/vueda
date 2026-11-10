# Agent Guidelines: Widgets

This directory holds the form widgets. A widget renders one field's value and reports the user's changes back to it. Read `../../AGENTS.md` first. This page adds the rules that apply only to widgets.

## The Value Stack

A widget's value passes through three composables. Read them in this order before changing how a widget reads or writes its value:

1. `lib/use/useForm.js` holds `values`, `initialValues`, and the `modified` aggregate for the whole form.
2. `lib/use/useField.js` reads one path from the form and decides whether the user has modified that field. It provides the field context.
3. `lib/use/useWidget.js` reads the field context and gives the widget `state.combinedValue`, `state.required`, `state.disabled`, and the touched and focused state. It applies `contextless`, and it falls back to `v-model` when no field context exists.

`docs/core-concepts/form-state-and-validation-lifecycle.md` owns the public account of form state, required checks, and the modified rule. Link to it instead of restating it.

## Rules

- Read and write the value through `widgetContext.state`. Many widgets also inject `FieldContextSymbol`, mostly to read `fieldId` for `id` and ARIA attributes. An injected field context ignores `contextless` unless the widget checks it.
- A field counts as modified when its value differs from its initial value under lodash `isEqual`, which compares types. `4` and `"4"` differ. A widget must not write a value with the same meaning in another form. It must not write a value when it mounts, opens, or closes.
- Choices endpoints send every option value as a string. Match a stored value to an option through `lib/utils/choiceLabels.js` (`choiceValuesMatch`, `findChoice`, `choiceLabel`), not with `===`. The read-only widgets and the list columns share that rule.
- Each widget imports its own theme file from `lib/theme/vueda-tailwind/widgets/`. `lib/theme/vueda-tailwind/AGENTS.md` covers theme keys and tokens.

## Tests

Widget specs live in `client/tests/unit/lib/widgets/`. A suffix names a spec that renders a real dependency, which the plain spec replaces with stubs:

- `*.reka.spec.js` mounts the real Reka controls. Use it for behavior that Reka owns, such as which option it checks or what it emits on a click.
- `*.tiptap.spec.js` mounts the real Tiptap editor.

jsdom has no layout, which affects the real Reka specs:

- Reka's virtualizer renders no items, because its scroll container has no size. To assert on list items, mock `lib/controls/combobox/ComboboxVirtualizer.vue` with a component that renders every option through the default slot.
- jsdom has no `Element.prototype.scrollIntoView`, which Reka calls on the highlighted item. Stub it in the spec.

A fix for a widget bug needs a test that fails without the fix. Run the new cases against the unfixed widget before reporting them as regression tests.
