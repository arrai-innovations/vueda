import vitest from "@vitest/eslint-plugin";
import eslintConfigPrettier from "eslint-config-prettier";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";
import merge from "lodash-es/merge.js";
import neostandard from "neostandard";

const neostandardConfig = merge(
    {},
    ...neostandard({ noStyle: true })
        .filter((config) => !["neostandard/jsx", "neostandard/react"].includes(config.name))
        .map((config) => {
            if (config.files) {
                delete config.files;
            }
            return config;
        }),
);

const disableImportXRules = Object.fromEntries(
    Object.keys(neostandardConfig.rules)
        .filter((ruleName) => ruleName.startsWith("import-x/"))
        .map((ruleName) => [ruleName, "off"]),
);

const vueConfig = merge(
    {},
    ...pluginVue.configs["flat/recommended"].map((ruleObj) => {
        if (ruleObj.files) {
            delete ruleObj.files;
        }
        return ruleObj;
    }),
);

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

const eslintConfig = [
    {
        name: "always (overrides)",
        files: [
            "client/**/*.{js,cjs,mjs,vue}",
            "docs/**/*.{js,cjs,mjs,vue}",
            "docs-tooling/**/*.{js,cjs,mjs,vue}",
            "*.{js,cjs,mjs}",
        ],
        ...neostandardConfig,
        rules: {
            ...neostandardConfig.rules,
            ...restrictedImportsRules,
            ...disableImportXRules,
            curly: "error",
            "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
            "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
        },
    },
    {
        name: "SFCs",
        files: ["client/lib/**/*.vue", "docs/**/*.vue"],
        ...vueConfig,
        rules: {
            ...vueConfig.rules,
            "vue/multi-word-component-names": "off",
        },
    },
    {
        name: "tests",
        files: ["client/tests/**/*.{js,cjs,mjs}", "docs-tooling/tests/**/*.{js,cjs,mjs}"],
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
            "vitest/valid-expect": "off",
            "no-var": "off",
        },
    },
    {
        name: "tests (helpers)",
        files: ["client/tests/unit/utils.js"],
        rules: {
            "vitest/expect-expect": "off",
            "vitest/valid-title": "off",
        },
    },
    eslintConfigPrettier,
    {
        ignores: [
            ".git/**",
            ".uv-cache/**",
            "**/.uv-cache/**",
            ".venv/**",
            "**/.venv/**",
            ".claude/**",
            "**/.claude/**",
            "**/node_modules/**",
            "**/dist/**",
            "**/coverage/**",
            "client/types/**",
            "docs/public/assets/mermaid/mermaid.min.js",
            "docs/reference/api/**",
            "docs/public/api/**",
            "docs/.generated/**",
            "docs-tooling/.generated/**",
            "templates/**",
        ],
    },
    {
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
