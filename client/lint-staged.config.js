export default {
    "**/*.{vue,js,cjs,mjs,ts,jsx,tsx}": [
        "npx --no-install eslint --no-warn-ignored --cache --fix",
        "npx --no-install prettier --write",
    ],
    "!(AGENT).{markdown,md}": ["npx --no-install doctoc --github -u --notitle"],
    "**/*.{less,scss,css,vue,markdown,json,md,yml,yaml,html}": ["npx --no-install prettier --write"],
    ".circleci/config.yml": ["circleci config validate"],
};
