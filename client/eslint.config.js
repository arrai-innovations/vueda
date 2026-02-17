import vitest from "@vitest/eslint-plugin";
import eslintConfigPrettier from "eslint-config-prettier";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";
import merge from "lodash-es/merge.js";
import neostandard from "neostandard";

// Flat config note: we prefer composing small, explicit blocks instead of one
// big object. This makes it easier for downstream apps to delete/extend pieces.

// skip jsx/react, skip files rules
const neostandardConfig = merge(
    {},
    ...neostandard({ noStyle: true })
        .filter((config) => !["neostandard/jsx", "neostandard/react"].includes(config.name))
        .map((config) => {
            if (config.files) {
                // Apply the base rules globally; file globs in upstream presets
                // can be too narrow for monorepo layouts.
                delete config.files;
            }
            return config;
        }),
);

// import-x rules break in SFCs
const disableImportXRules = Object.fromEntries(
    Object.keys(neostandardConfig.rules)
        .filter((ruleName) => ruleName.startsWith("import-x/"))
        .map((ruleName) => [ruleName, "off"]),
);

// Vue preset ships with file globs; remove them to let us scope manually.
const vueConfig = merge(
    {},
    ...pluginVue.configs["flat/recommended"].map((ruleObj) => {
        if (ruleObj.files) {
            // We'll re-apply SFC rules with our own glob below.
            delete ruleObj.files;
        }
        return ruleObj;
    }),
);

// Restrict barrel imports from lodash-es to encourage consistent direct imports.
const restrictedImportsRules = {
    "no-restricted-imports": [
        "error",
        {
            paths: [
                {
                    name: "lodash-es",
                    message: "Use direct lodash-es imports instead of barrel files.",
                },
                {
                    name: "lodash-es/string.js",
                    message: "Use direct lodash-es imports instead of barrel files.",
                },
                {
                    name: "lodash-es/array.js",
                    message: "Use direct lodash-es imports instead of barrel files.",
                },
                {
                    name: "lodash-es/collection.js",
                    message: "Use direct lodash-es imports instead of barrel files.",
                },
                {
                    name: "lodash-es/date.js",
                    message: "Use direct lodash-es imports instead of barrel files.",
                },
                {
                    name: "lodash-es/function.js",
                    message: "Use direct lodash-es imports instead of barrel files.",
                },
                {
                    name: "lodash-es/lang.js",
                    message: "Use direct lodash-es imports instead of barrel files.",
                },
                {
                    name: "lodash-es/math.js",
                    message: "Use direct lodash-es imports instead of barrel files.",
                },
                {
                    name: "lodash-es/number.js",
                    message: "Use direct lodash-es imports instead of barrel files.",
                },
                {
                    name: "lodash-es/object.js",
                    message: "Use direct lodash-es imports instead of barrel files.",
                },
                {
                    name: "lodash-es/seq.js",
                    message: "Use direct lodash-es imports instead of barrel files.",
                },
                {
                    name: "lodash-es/util.js",
                    message: "Use direct lodash-es imports instead of barrel files.",
                },
                {
                    name: "lodash-es/lodash.js",
                    message: "Use direct lodash-es imports instead of barrel files.",
                },
                {
                    name: "lodash-es/lodash.default.js",
                    message: "Use direct lodash-es imports instead of barrel files.",
                },
            ],
        },
    ],
};

// Final ESLint configuration object
const eslintConfig = [
    {
        name: "always (overrides)",
        files: ["**/*.js", "**/*.cjs", "**/*.mjs", "**/*.vue"],
        ...neostandardConfig,
        rules: {
            ...neostandardConfig.rules,
            ...restrictedImportsRules,
            ...disableImportXRules,
            // Keep linting strict in library code; the preset is intentionally
            // light on stylistic rules so Prettier can own formatting.
            curly: "error",
            "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
            "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
        },
    },
    {
        name: "SFCs",
        files: ["lib/**/*.vue"],
        // Vue-specific rules scoped to actual component files.
        ...vueConfig,
    },
    {
        name: "tests",
        files: ["tests/**/*.js", "tests/**/*.cjs", "tests/**/*.mjs"],
        plugins: {
            vitest,
        },
        languageOptions: {
            globals: {
                ...vitest.environments.env.globals,
            },
        },
        rules: {
            ...vitest.configs.recommended.rules,
            "vitest/no-conditional-expect": "off",
            "vitest/no-standalone-expect": [
                "error",
                {
                    additionalTestBlockFunctions: [
                        "scopedIt",
                        "scopedIt.only",
                        "scopedIt.skip",
                        "scopedIt.concurrent",
                        "scopedIt.sequential",
                        "scopedIt.fails",
                        "scopedIt.todo",
                        "scopedIt.each",
                        "scopedIt.for",
                    ],
                },
            ],
            "vitest/valid-expect": "off", // we want to use expect(value, message).toBe(expected), which is not supported by this rule
            "no-var": "off", // this does not work with vitest.mock, which requires var hoisted variables
        },
    },
    {
        name: "tests (helpers)",
        files: ["tests/unit/utils.js"],
        rules: {
            "vitest/expect-expect": "off",
            "vitest/valid-title": "off",
        },
    },
    // Disable conflicting rules so Prettier is the formatting source of truth.
    eslintConfigPrettier,
    // Ignore build artifacts and generated output.
    { ignores: ["node_modules", "dist", "types", "coverage"] },
    {
        // Global language options for all files that don't override them.
        languageOptions: {
            ecmaVersion: "latest",
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
    },
];
export default eslintConfig;
