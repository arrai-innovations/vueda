/**
 * @module theme/vueda-tailwind/icons/fontAwesomeFree
 * @description Font Awesome Free icon registry preset for the default VUEDA Tailwind theme.
 *
 * This module is intentionally not imported by `theme/vueda-tailwind/index.js`, so projects
 * that use another icon system do not pay for Font Awesome. Opt in by importing this registry
 * and passing it to `setIcons()` during app setup.
 */
import {
    faAnglesLeft,
    faAnglesRight,
    faArrowRightLong,
    faArrowRotateLeft,
    faArrowUpRightFromSquare,
    faBan,
    faBars,
    faCalendarDays,
    faCaretDown,
    faCaretUp,
    faCheck,
    faChevronDown,
    faChevronLeft,
    faChevronRight,
    faCircle,
    faCircleCheck,
    faCircleExclamation,
    faCircleInfo,
    faCircleNotch,
    faCircleQuestion,
    faClock,
    faCopy,
    faDownload,
    faEllipsis,
    faFilter,
    faFlag,
    faFloppyDisk,
    faFolderOpen,
    faGripVertical,
    faHourglassHalf,
    faIdCard,
    faInbox,
    faLifeRing,
    faMagnifyingGlass,
    faMinus,
    faPen,
    faPlus,
    faPrint,
    faShieldHalved,
    faSort,
    faSortDown,
    faTable,
    faTrash,
    faTriangleExclamation,
    faUpload,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { setIcons } from "@vueda/use/useIcons.js";

const icon = (definition, props = {}) => ({
    component: FontAwesomeIcon,
    props: { icon: definition, ...props },
});

/**
 * Font Awesome Free icon registry covering the icon keys used by the default
 * VUEDA Tailwind components and documentation demos.
 *
 * @type {import('@vueda/use/useIcons.js').IconRegistry}
 */
export const fontAwesomeFreeIcons = {
    Checkbox: {
        check: icon(faCheck),
        indeterminate: icon(faMinus),
    },
    ObjectsGrid: {
        empty: icon(faFolderOpen),
        error: icon(faTriangleExclamation),
        filtered: icon(faCircleQuestion),
    },
    Default: {
        actionNotFound: icon(faBan),
        anglesLeft: icon(faAnglesLeft),
        anglesRight: icon(faAnglesRight),
        calendar: icon(faCalendarDays),
        caretDown: icon(faCaretDown),
        caretUp: icon(faCaretUp),
        check: icon(faCheck),
        chevronDown: icon(faChevronDown),
        chevronLeft: icon(faChevronLeft),
        chevronRight: icon(faChevronRight),
        circle: icon(faCircle),
        circleCheck: icon(faCircleCheck),
        clock: icon(faClock),
        close: icon(faXmark),
        copy: icon(faCopy),
        download: icon(faDownload),
        ellipsis: icon(faEllipsis),
        empty: icon(faInbox),
        errored: icon(faCircleExclamation),
        externalLink: icon(faArrowUpRightFromSquare),
        filter: icon(faFilter),
        flag: icon(faFlag),
        floppyDisk: icon(faFloppyDisk),
        gripVertical: icon(faGripVertical),
        hourglass: icon(faHourglassHalf),
        idCard: icon(faIdCard),
        info: icon(faCircleInfo),
        lifeRing: icon(faLifeRing),
        loading: icon(faCircleNotch, { spin: true }),
        minus: icon(faMinus),
        notFound: icon(faCircleQuestion),
        plus: icon(faPlus),
        print: icon(faPrint),
        rangeSeparator: icon(faArrowRightLong),
        search: icon(faMagnifyingGlass),
        shieldHalved: icon(faShieldHalved),
        sort: icon(faSort),
        sortDown: icon(faSortDown),
        table: icon(faTable),
        toggle: icon(faBars),
        triangleExclamation: icon(faTriangleExclamation),
        typeCreated: icon(faPlus),
        typeDeleted: icon(faTrash),
        typeRestored: icon(faArrowRotateLeft),
        typeUpdated: icon(faPen),
        upload: icon(faUpload),
        warning: icon(faTriangleExclamation),
    },
};

/**
 * Install the Font Awesome Free icon registry as the active global icon registry.
 *
 * @returns {void}
 */
export function installFontAwesomeFreeIcons() {
    setIcons(fontAwesomeFreeIcons);
}

export default fontAwesomeFreeIcons;
