const warningForComponent = (component) => {
    return {
        warning: {
            borderColor: `{form.field.warning.border.color}`,
            placeholderColor: `{form.field.warning.placeholder.color}`,
        },
        css: ({ dt }) =>
            `
.p-warning.p-${component},
.p-warning .p-${component} {
    border-color: ${dt(component + ".warning.borderColor")};
}
.p-warning.p-${component}::placeholder,
.p-warning .p-${component}::placeholder {
    color: ${dt(component + ".warning.placeholderColor")};
}
`,
    };
};

export const warningsPrimeVueConfig = {
    semantic: {
        extend: {
            colorScheme: {
                light: {
                    formField: {
                        warningBorderColor: "{amber.300}",
                        warningPlaceholderColor: "{amber.400}",
                    },
                },
                dark: {
                    formField: {
                        warningBorderColor: "{amber.300}",
                        warningPlaceholderColor: "{amber.400}",
                    },
                },
            },
        },
    },
    components: {
        select: warningForComponent("select"),
        inputtext: warningForComponent("inputtext"),
        datepicker: warningForComponent("datepicker"),
        textarea: warningForComponent("textarea"),
    },
};
