module.exports = {
    trailingComma: "all",
    printWidth: 120,
    tabWidth: 4,
    plugins: ["@trivago/prettier-plugin-sort-imports"],
    importOrder: ["^@\\/(.*)$"],
    importOrderSeparation: true,
    importOrderSortSpecifiers: true,
};
