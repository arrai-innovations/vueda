import eslintConfigPrettier from "eslint-config-prettier";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";
import merge from "lodash-es/merge.js";
import neostandard from "neostandard";

const neostandardConfig = merge(
    {},
    ...neostandard({ noStyle: true }).map((config) => {
        if (config.files) {
            delete config.files;
        }
        return config;
    }),
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

export default [
    {
        name: "js",
        files: ["**/*.js", "**/*.cjs", "**/*.mjs", "**/*.vue"],
        ...neostandardConfig,
        rules: {
            ...neostandardConfig.rules,
            curly: "error",
            "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
            "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
        },
    },
    {
        name: "SFCs",
        files: ["src/**/*.vue"],
        ...vueConfig,
    },
    eslintConfigPrettier,
    { ignores: ["node_modules", "dist", "coverage"] },
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
