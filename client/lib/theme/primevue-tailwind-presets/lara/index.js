import accordion from "./accordion/index.js";
import autocomplete from "./autocomplete/index.js";
import avatar from "./avatar/index.js";
import avatargroup from "./avatargroup/index.js";
import badge from "./badge/index.js";
import badgedirective from "./badgedirective/index.js";
import blockui from "./blockui/index.js";
import breadcrumb from "./breadcrumb/index.js";
import button from "./button/index.js";
import calendar from "./calendar/index.js";
import card from "./card/index.js";
import carousel from "./carousel/index.js";
import cascadeselect from "./cascadeselect/index.js";
import checkbox from "./checkbox/index.js";
import chip from "./chip/index.js";
import chips from "./chips/index.js";
import colorpicker from "./colorpicker/index.js";
import confirmpopup from "./confirmpopup/index.js";
import contextmenu from "./contextmenu/index.js";
import datatable from "./datatable/index.js";
import dataview from "./dataview/index.js";
import dataviewlayoutoptions from "./dataviewlayoutoptions/index.js";
import deferred from "./deferred/index.js";
import dialog from "./dialog/index.js";
import divider from "./divider/index.js";
import dock from "./dock/index.js";
import dropdown from "./dropdown/index.js";
import fieldset from "./fieldset/index.js";
import fileupload from "./fileupload/index.js";
import floatlabel from "./floatlabel/index.js";
import galleria from "./galleria/index.js";
import global from "./global.js";
import iconfield from "./iconfield/index.js";
import image from "./image/index.js";
import inlinemessage from "./inlinemessage/index.js";
import inplace from "./inplace/index.js";
import inputgroup from "./inputgroup/index.js";
import inputgroupaddon from "./inputgroupaddon/index.js";
import inputmask from "./inputmask/index.js";
import inputnumber from "./inputnumber/index.js";
import inputotp from "./inputotp/index.js";
import inputswitch from "./inputswitch/index.js";
import inputtext from "./inputtext/index.js";
import knob from "./knob/index.js";
import listbox from "./listbox/index.js";
import megamenu from "./megamenu/index.js";
import menu from "./menu/index.js";
import menubar from "./menubar/index.js";
import message from "./message/index.js";
import metergroup from "./metergroup/index.js";
import multiselect from "./multiselect/index.js";
import orderlist from "./orderlist/index.js";
import organizationchart from "./organizationchart/index.js";
import overlaypanel from "./overlaypanel/index.js";
import paginator from "./paginator/index.js";
import panel from "./panel/index.js";
import panelmenu from "./panelmenu/index.js";
import password from "./password/index.js";
import picklist from "./picklist/index.js";
import progressbar from "./progressbar/index.js";
import progressspinner from "./progressspinner/index.js";
import radiobutton from "./radiobutton/index.js";
import rating from "./rating/index.js";
import ripple from "./ripple/index.js";
import scrollpanel from "./scrollpanel/index.js";
import scrolltop from "./scrolltop/index.js";
import selectbutton from "./selectbutton/index.js";
import sidebar from "./sidebar/index.js";
import skeleton from "./skeleton/index.js";
import slider from "./slider/index.js";
import speeddial from "./speeddial/index.js";
import splitbutton from "./splitbutton/index.js";
import splitter from "./splitter/index.js";
import splitterpanel from "./splitterpanel/index.js";
import stepper from "./stepper/index.js";
import steps from "./steps/index.js";
import tabmenu from "./tabmenu/index.js";
import tabview from "./tabview/index.js";
import tag from "./tag/index.js";
import terminal from "./terminal/index.js";
import textarea from "./textarea/index.js";
import tieredmenu from "./tieredmenu/index.js";
import timeline from "./timeline/index.js";
import toast from "./toast/index.js";
import togglebutton from "./togglebutton/index.js";
import toolbar from "./toolbar/index.js";
import tooltip from "./tooltip/index.js";
import tree from "./tree/index.js";
import treeselect from "./treeselect/index.js";
import treetable from "./treetable/index.js";
import tristatecheckbox from "./tristatecheckbox/index.js";

export default {
    global,
    directives: {
        badge: badgedirective,
        ripple,
        tooltip,
    },

    //forms
    autocomplete,
    dropdown,
    inputnumber,
    inputtext,
    calendar,
    checkbox,
    radiobutton,
    inputswitch,
    selectbutton,
    slider,
    chips,
    rating,
    multiselect,
    togglebutton,
    cascadeselect,
    listbox,
    colorpicker,
    inputgroup,
    inputgroupaddon,
    inputmask,
    knob,
    treeselect,
    tristatecheckbox,
    textarea,
    password,
    iconfield,
    floatlabel,
    inputotp,

    //buttons
    button,
    splitbutton,
    speeddial,

    //data
    paginator,
    datatable,
    tree,
    dataview,
    dataviewlayoutoptions,
    organizationchart,
    orderlist,
    picklist,
    treetable,
    timeline,

    //panels
    accordion,
    panel,
    fieldset,
    card,
    tabview,
    divider,
    toolbar,
    scrollpanel,
    splitter,
    splitterpanel,
    stepper,
    deferred,

    //file
    fileupload,

    //menu
    contextmenu,
    menu,
    menubar,
    steps,
    tieredmenu,
    breadcrumb,
    panelmenu,
    megamenu,
    dock,
    tabmenu,

    //overlays
    dialog,
    overlaypanel,
    sidebar,
    confirmpopup,

    //messages
    message,
    inlinemessage,
    toast,

    //media
    carousel,
    galleria,
    image,

    //misc
    badge,
    avatar,
    avatargroup,
    tag,
    chip,
    progressbar,
    skeleton,
    scrolltop,
    terminal,
    blockui,
    metergroup,
    inplace,
    progressspinner,
};
