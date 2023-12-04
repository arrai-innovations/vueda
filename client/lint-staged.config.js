export default {
    "**/*.{js,cjs,mjs,ts,jsx,tsx}": ["npx --no-install eslint --fix", "npx --no-install prettier --write"],
    "**/*.{markdown,md}": ["npx --no-install doctoc --github -u ."],
    "**/*.{less,scss,css,vue,markdown,json,md,yml,yaml,html}": ["npx --no-install prettier --write"],
    ".circleci/config.yml": ["circleci config validate"],
};
