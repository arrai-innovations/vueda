module.exports = {
    root: true,
    parserOptions: {
        emcaVersion: 2023,
    },
    env: {
        node: true,
        "vue/setup-compiler-macros": true,
    },
    plugins: ["no-autofix", "jsdoc", "vue", "vitest", "prettier-vue"],
    extends: [
        "eslint:recommended",
        "plugin:vue/vue3-recommended",
        "plugin:vitest/recommended",
        "plugin:jsdoc/recommended",
        "plugin:prettier-vue/recommended",
    ],
    rules: {
        curly: "error",
        "no-console": "off", // console.error is useful.
        "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
        "space-before-function-paren": [
            "error",
            {
                anonymous: "always",
                named: "never",
                asyncArrow: "always",
            },
        ],
        "vue/no-v-html": "off",
        "vue/no-use-v-if-with-v-for": "off", // ifs process before fors.
        "vue/attributes-order": [
            // switch order so conditionals go before list to match above rule.
            "error",
            {
                order: [
                    "DEFINITION",
                    "CONDITIONALS",
                    "LIST_RENDERING",
                    "RENDER_MODIFIERS",
                    "GLOBAL",
                    "UNIQUE",
                    "SLOT",
                    "TWO_WAY_BINDING",
                    "OTHER_DIRECTIVES",
                    "OTHER_ATTR",
                    "EVENTS",
                    "CONTENT",
                ],
                alphabetical: true,
            },
        ],
        "jsdoc/require-jsdoc": "off", // let's ease into this
        "node/no-missing-import": "off", // vite handles this
        "node/no-unpublished-import": "off", // vite handles this
        "prefer-const": "error",
    },
};
