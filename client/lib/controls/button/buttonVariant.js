/**
 * @module controls/button/buttonVariant
 * @description Resolves a Button's two design axes (tone and emphasis) into the
 * `_Button*` composition primitive that paints it. Shared by `Button.vue` (for
 * the `data-tone` / `data-emphasis` attributes) and `Button.theme.js` (for the
 * composed primitive and the inline-flow flag) so the mapping lives in exactly
 * one place.
 */

/**
 * @typedef {'neutral' | 'primary' | 'destructive'} ButtonTone
 */

/**
 * @typedef {'fill' | 'outline' | 'ghost' | 'link'} ButtonEmphasis
 */

/**
 * @typedef {object} ResolvedButtonVariant
 * @property {ButtonTone} tone - The resolved color axis.
 * @property {ButtonEmphasis} emphasis - The resolved structure axis.
 * @property {string} primitive - The `_Button*` theme key that paints this cell.
 * @property {boolean} inline - True for inline-flow emphases (`link`) that skip the control-height + padding recipe.
 */

/**
 * The default (tone, emphasis) used when nothing is specified. A bare
 * `<Button>` is a neutral filled chip, not a CTA: the primary fill is opt-in
 * (`tone="primary"`), so an unmarked button never claims the earned accent.
 * @type {{ tone: ButtonTone, emphasis: ButtonEmphasis }}
 */
const DEFAULT_VARIANT = { tone: "neutral", emphasis: "fill" };

/**
 * Realized (tone, emphasis) cells, keyed `"<tone>:<emphasis>"`, mapped to the
 * `_Button*` primitive that paints them. Unauthored cells fall back to the
 * neutral primitive for the same emphasis (see {@link resolveButtonVariant}).
 * @type {{ [key: string]: string }}
 */
const PRIMITIVE_BY_CELL = {
    "primary:fill": "_ButtonDefault",
    "neutral:fill": "_ButtonSecondary",
    "destructive:fill": "_ButtonDestructive",
    "neutral:outline": "_ButtonOutline",
    "primary:outline": "_ButtonPrimaryOutline",
    "destructive:outline": "_ButtonDestructiveOutline",
    "neutral:ghost": "_ButtonGhost",
    "primary:ghost": "_ButtonPrimaryGhost",
    "destructive:ghost": "_ButtonDestructiveGhost",
    "primary:link": "_ButtonLink",
    "neutral:link": "_ButtonNeutralLink",
    "destructive:link": "_ButtonDestructiveLink",
};

/**
 * Emphases that render inline (no control height, no horizontal padding) so the
 * affordance does not break surrounding line metrics.
 * @type {Set<ButtonEmphasis>}
 */
const INLINE_EMPHASES = new Set(["link"]);

/**
 * Folds the explicit `tone` / `emphasis` props into a single resolved cell. With
 * nothing set, falls back to {@link DEFAULT_VARIANT}.
 *
 * @param {object} [props] - The button's tone and emphasis props.
 * @param {ButtonTone} [props.tone] - Explicit tone axis.
 * @param {ButtonEmphasis} [props.emphasis] - Explicit emphasis axis.
 * @returns {ResolvedButtonVariant} The resolved tone, emphasis, primitive key, and inline flag.
 */
export function resolveButtonVariant({ tone, emphasis } = {}) {
    const resolvedTone = tone || DEFAULT_VARIANT.tone;
    const resolvedEmphasis = emphasis || DEFAULT_VARIANT.emphasis;
    const primitive =
        PRIMITIVE_BY_CELL[`${resolvedTone}:${resolvedEmphasis}`] ||
        PRIMITIVE_BY_CELL[`neutral:${resolvedEmphasis}`] ||
        "_ButtonSecondary";
    return {
        tone: resolvedTone,
        emphasis: resolvedEmphasis,
        primitive,
        inline: INLINE_EMPHASES.has(resolvedEmphasis),
    };
}
