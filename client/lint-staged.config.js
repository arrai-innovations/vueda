export default {
    "**/*.{js,cjs,vue}": ["npx --no-install eslint --fix", "npx --no-install prettier --write"],
    "**/*.{markdown,md}": ["npx --no-install doctoc --github -u --notitle"],
    "**/*.{less,scss,css,vue,markdown,json,md,yml,yaml,html}": ["npx --no-install prettier --write"],
    ".circleci/config.yml": ["circleci config validate"],
};
