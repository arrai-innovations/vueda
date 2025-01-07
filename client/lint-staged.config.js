import { ESLint } from "eslint";

// this works around eslint warning about ignored files when they are changed
// since they manually get passed in as arguments, eslint complains
const removeIgnoredFiles = async (files) => {
    const eslint = new ESLint();
    const ignoredFiles = await Promise.all(files.map((file) => eslint.isPathIgnored(file)));
    const filteredFiles = files.filter((_, index) => !ignoredFiles[index]);
    return filteredFiles.join(" ");
};

export default {
    "**/*.{vue,js,cjs,mjs,ts,jsx,tsx}": async (files) => {
        const filesToLint = await removeIgnoredFiles(files);
        return [
            `npx --no-install eslint --cache --fix ${filesToLint}`,
            `npx --no-install prettier --write -- ${filesToLint}`,
        ];
    },
    "**/*.{markdown,md}": ["npx --no-install doctoc --github -u --notitle"],
    "**/*.{less,scss,css,vue,markdown,json,md,yml,yaml,html}": ["npx --no-install prettier --write"],
    ".circleci/config.yml": ["circleci config validate"],
};
