import fieldSets from "@vueda/theme/vueda-tailwind/fieldSets/index.js";
import display from "@vueda/theme/vueda-tailwind/display/index.js";
import form from "@vueda/theme/vueda-tailwind/form/index.js";
import objectsGrid from "@vueda/theme/vueda-tailwind/objects-grid/index.js";
import views from "@vueda/theme/vueda-tailwind/views/index.js";
import widgets from "@vueda/theme/vueda-tailwind/widgets/index.js";

export default {
    ...objectsGrid,
    ...form,
    ...widgets,
    ...fieldSets,
    ...views,
    ...display,
    PaginationComponent: {
        root: {
            class: "card",
        },
        paginator: {
            class: [],
        },
    },
};
