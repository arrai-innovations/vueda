/**
 * @module theme/vueda-tailwind
 * @description Aggregated Tailwind CSS pass-through theme configuration for all VUEDA Client components.
 */
import controls from "@vueda/theme/vueda-tailwind/controls/index.js";
import display from "@vueda/theme/vueda-tailwind/display/index.js";
import feedback from "@vueda/theme/vueda-tailwind/feedback/index.js";
import form from "@vueda/theme/vueda-tailwind/form/index.js";
import grid from "@vueda/theme/vueda-tailwind/grid/index.js";
import navigation from "@vueda/theme/vueda-tailwind/navigation/index.js";
import objectsGrid from "@vueda/theme/vueda-tailwind/objects-grid/index.js";
import shell from "@vueda/theme/vueda-tailwind/shell/index.js";
import views from "@vueda/theme/vueda-tailwind/views/index.js";
import widgets from "@vueda/theme/vueda-tailwind/widgets/index.js";

export default {
    ...controls,
    ...grid,
    ...objectsGrid,
    ...form,
    ...navigation,
    ...shell,
    ...widgets,
    ...views,
    ...display,
    ...feedback,
};
