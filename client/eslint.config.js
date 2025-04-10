import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import vitest from "eslint-plugin-vitest";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";

const mergedVueConfig = pluginVue.configs["flat/recommended"].reduce((acc, config) => {
    for (const [key, value] of Object.entries(config)) {
        if (key === "files" || key === "ignores") {
            continue;
        }
        if (key === "rules" || key === "plugins" || key === "languageOptions") {
            acc[key] = { ...(acc[key] || {}), ...value };
        } else if (key === "processor") {
            acc.processor ??= value;
        } else {
            acc[key] ??= value;
        }
    }
    return acc;
}, {});
export default [
    { ignores: ["node_modules", ".prettierrc.js", "dist", "src/primevue-tailwind-presets"] },
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2023,
            },
        },
    },
    {
        name: "always",
        files: ["**/*.js"],
        rules: {
            ...js.configs.recommended.rules,
            curly: "error",
            "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
            "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
            "space-before-function-paren": [
                "error",
                {
                    anonymous: "always",
                    named: "never",
                    asyncArrow: "always",
                },
            ],
        },
    },
    {
        name: "non-tests",
        files: ["src/**/*.{js,vue}"],
        ...mergedVueConfig,
        ...eslintConfigPrettier,
        plugins: {
            ...mergedVueConfig.plugins,
            ...eslintConfigPrettier.plugins,
        },
        rules: {
            ...pluginVue.configs["flat/recommended"].rules,
            ...eslintConfigPrettier.rules,
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
        },
    },
    // tests
    {
        name: "tests",
        files: ["tests/**/*.{test,spec}.?(c|m)[jt]s?(x)", "tests/unit/utils.js"],
        plugins: { vitest },
        languageOptions: {
            globals: {
                ...vitest.environments.env.globals,
            },
        },
        rules: {
            ...vitest.configs.recommended.rules,
            "vitest/no-conditional-expect": "off",
            "vitest/valid-expect": "off", // we want to use expect(value, message).toBe(expected), which is not supported by this rule
        },
    },
];
