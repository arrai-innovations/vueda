/**
 * @module controls/button/buttonVariant
 * @description Resolves a Button's two design axes (tone and emphasis) into the
 * `_Button*` composition primitive that paints it. The flat `variant` prop is a
 * backward-compatibility shim that maps to a (tone, emphasis) pair, so existing
 * call sites and the shadcn-style API shape keep working while the theme
 * resolves on two axes underneath. Shared by `Button.vue` (for the `data-tone` /
 * `data-emphasis` attributes) and `Button.theme.js` (for the composed primitive
 * and the inline-flow flag) so the mapping lives in exactly one place.
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
 * The resting (tone, emphasis) used when nothing is specified. A bare
 * `<Button>` is a neutral filled chip, not a CTA: the primary fill is opt-in
 * (`variant="default"` or `tone="primary"`), so an unmarked button never claims
 * the earned accent. Equivalent to the legacy `secondary` variant.
 * @type {{ tone: ButtonTone, emphasis: ButtonEmphasis }}
 */
const DEFAULT_VARIANT = { tone: "neutral", emphasis: "fill" };

/**
 * shadcn-style flat `variant` values, mapped to their (tone, emphasis) pair.
 * @type {{ [variant: string]: { tone: ButtonTone, emphasis: ButtonEmphasis } }}
 */
const VARIANT_SHIM = {
    default: { tone: "primary", emphasis: "fill" },
    secondary: { tone: "neutral", emphasis: "fill" },
    destructive: { tone: "destructive", emphasis: "fill" },
    outline: { tone: "neutral", emphasis: "outline" },
    ghost: { tone: "neutral", emphasis: "ghost" },
    link: { tone: "primary", emphasis: "link" },
};

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
 * Folds the `variant` shim and the explicit `tone` / `emphasis` props into a
 * single resolved cell. Explicit `tone` / `emphasis` override the variant-derived
 * value per axis, so `variant="link" tone="destructive"` yields a destructive
 * link. With nothing set, falls back to {@link DEFAULT_VARIANT}.
 *
 * @param {object} [props] - The button's variant props.
 * @param {string} [props.variant] - shadcn-style flat variant.
 * @param {ButtonTone} [props.tone] - Explicit tone axis.
 * @param {ButtonEmphasis} [props.emphasis] - Explicit emphasis axis.
 * @returns {ResolvedButtonVariant} The resolved tone, emphasis, primitive key, and inline flag.
 */
export function resolveButtonVariant({ variant, tone, emphasis } = {}) {
    const base = (variant && VARIANT_SHIM[variant]) || DEFAULT_VARIANT;
    const resolvedTone = tone || base.tone;
    const resolvedEmphasis = emphasis || base.emphasis;
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
