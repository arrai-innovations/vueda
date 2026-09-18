/**
 * @module utils/formValuePath
 * @description Converts a dotted public field/filter identity into the literal, non-nesting path `useForm`'s lodash-based value storage addresses it by.
 */

/**
 * The path to store a field's value under in `useForm`'s `state.values` (and its sibling maps:
 * `initialValues`, `errors`, `touched`, ...), given its dotted public identity.
 *
 * `useForm` reads and writes `values` and `initialValues` with lodash `get`/`set`/`unset`, which
 * treat a bare `.` in a path as structural nesting — correct for a genuine array or fieldset path,
 * where the dots mirror real nested submit JSON. A related filter or an expand-flattened display
 * field is not that: it is one flat value under one dotted public name, and letting its dots nest
 * would silently split it into an object no server request shape expects.
 *
 * Wrapping a dotted name in lodash's own bracket-quoted path syntax (`['employee.name']`) is what
 * tells `get`/`set`/`unset` to address it as a single literal key, dots and all, instead of
 * splitting on them. A name with no dot has nothing to protect from nesting, so it passes through
 * unchanged: `errors`, `messages`, and `touched` key a field by its raw name (not by this path), and
 * only agree with `values`/`initialValues` when an undotted name round-trips as itself here.
 *
 * Call this wherever a dotted public identity is handed to `useForm` outside a real
 * `fieldSetContext` — `useFieldRenderer`'s `fieldValuePath` does.
 *
 * @param {string} name - A field or filter's dotted public identity (e.g. `"employee.name"`).
 * @returns {string} The literal lodash path to store its value under.
 */
export function toFlatValuePath(name) {
    return name.includes(".") ? `['${name}']` : name;
}
