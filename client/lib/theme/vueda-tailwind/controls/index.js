/**
 * @module theme/vueda-tailwind/controls
 * @description Tailwind CSS theme configuration for VUEDA Client control primitives.
 */
import "./Button.theme.js";
import "./ButtonGroup.theme.js";
import "./ButtonGroupSeparator.theme.js";
import "./ButtonGroupText.theme.js";
import "./Calendar.theme.js";
import "./CalendarCell.theme.js";
import "./CalendarCellTrigger.theme.js";
import "./CalendarFooter.theme.js";
import "./CalendarGrid.theme.js";
import "./CalendarGridRow.theme.js";
import "./CalendarHeadCell.theme.js";
import "./CalendarHeader.theme.js";
import "./CalendarHeading.theme.js";
import "./CalendarNavButton.theme.js";
import "./Checkbox.theme.js";
import "./ComboboxAnchor.theme.js";
import "./ComboboxEmpty.theme.js";
import "./ComboboxGroup.theme.js";
import "./ComboboxInput.theme.js";
import "./ComboboxItem.theme.js";
import "./ComboboxItemIndicator.theme.js";
import "./ComboboxList.theme.js";
import "./ComboboxSeparator.theme.js";
import "./ComboboxTrigger.theme.js";
import "./ComboboxViewport.theme.js";
import "./Command.theme.js";
import "./CommandDialog.theme.js";
import "./CommandEmpty.theme.js";
import "./CommandFooter.theme.js";
import "./CommandGroup.theme.js";
import "./CommandInput.theme.js";
import "./CommandItem.theme.js";
import "./CommandList.theme.js";
import "./CommandSeparator.theme.js";
import "./CommandShortcut.theme.js";
import "./DateField.theme.js";
import "./DateFieldInput.theme.js";
import "./DateRangeField.theme.js";
import "./DateRangeFieldInput.theme.js";
import "./FileUpload.theme.js";
import "./Input.theme.js";
import "./InputGroup.theme.js";
import "./InputGroupAddon.theme.js";
import "./InputGroupButton.theme.js";
import "./InputGroupInput.theme.js";
import "./InputGroupText.theme.js";
import "./InputGroupTextarea.theme.js";
import "./InputOTP.theme.js";
import "./InputOTPGroup.theme.js";
import "./InputOTPSlot.theme.js";
import "./NativeSelect.theme.js";
import "./NativeSelectOptGroup.theme.js";
import "./NativeSelectOption.theme.js";
import "./NumberField.theme.js";
import "./NumberFieldContent.theme.js";
import "./NumberFieldDecrement.theme.js";
import "./NumberFieldIncrement.theme.js";
import "./NumberFieldInput.theme.js";
import "./RadioGroup.theme.js";
import "./RadioGroupItem.theme.js";
import "./RangeCalendar.theme.js";
import "./RangeCalendarCell.theme.js";
import "./RangeCalendarCellTrigger.theme.js";
import "./RangeCalendarGrid.theme.js";
import "./RangeCalendarGridRow.theme.js";
import "./RangeCalendarHeadCell.theme.js";
import "./RangeCalendarHeader.theme.js";
import "./RangeCalendarHeading.theme.js";
import "./RangeCalendarNextButton.theme.js";
import "./RangeCalendarPrevButton.theme.js";
import "./SelectContent.theme.js";
import "./SelectItem.theme.js";
import "./SelectLabel.theme.js";
import "./SelectScrollDownButton.theme.js";
import "./SelectScrollUpButton.theme.js";
import "./SelectSeparator.theme.js";
import "./SelectTrigger.theme.js";
import "./Slider.theme.js";
import "./Switch.theme.js";
import "./TagsInput.theme.js";
import "./TagsInputInput.theme.js";
import "./TagsInputItem.theme.js";
import "./TagsInputItemDelete.theme.js";
import "./TagsInputItemText.theme.js";
import "./Textarea.theme.js";
import "./TimeField.theme.js";
import "./TimeFieldInput.theme.js";
import "./Toggle.theme.js";
import "./ToggleGroup.theme.js";
import "./ToggleGroupItem.theme.js";
import "./_ButtonPrimitives.theme.js";

export default {
    // ---------- Button family meta keys ----------
    // Underscore-prefixed entries are composition primitives consumed by leaf
    // entries via `composes`. They are full theme entries and can be overridden
    // through setTheme / useThemeOverride; overriding `_ButtonBase` propagates
    // to every leaf that composes from it.
    _ButtonBase: {},
    _ButtonDefault: {},
    _ButtonDestructive: {},
    _ButtonOutline: {},
    _ButtonSecondary: {},
    _ButtonGhost: {},
    _ButtonLink: {},
    // ---------- Button ----------
    Button: {},
    // ---------- Button group ----------
    ButtonGroup: {},
    ButtonGroupSeparator: {},
    ButtonGroupText: {},
    // ---------- Toggle ----------
    Toggle: {},
    ToggleGroup: {},
    ToggleGroupItem: {},
    // ---------- File upload ----------
    FileUpload: {},
    // ---------- Text input ----------
    Input: {},
    Textarea: {},
    // ---------- Input group ----------
    InputGroup: {},
    InputGroupAddon: {},
    InputGroupInput: {},
    InputGroupTextarea: {},
    InputGroupText: {},
    InputGroupButton: {},
    // ---------- Input OTP ----------
    InputOTP: {},
    InputOTPGroup: {},
    InputOTPSlot: {},
    // ---------- Native select ----------
    NativeSelect: {},
    NativeSelectOptGroup: {},
    NativeSelectOption: {},
    // ---------- Number field ----------
    NumberField: {},
    NumberFieldContent: {},
    NumberFieldInput: {},
    NumberFieldDecrement: {},
    NumberFieldIncrement: {},
    // ---------- Date / time fields ----------
    DateField: {},
    DateFieldInput: {},
    DateRangeField: {},
    DateRangeFieldInput: {},
    TimeField: {},
    TimeFieldInput: {},
    // ---------- Calendar ----------
    Calendar: {},
    CalendarHeader: {},
    CalendarHeading: {},
    CalendarNavButton: {},
    CalendarGrid: {},
    CalendarGridRow: {},
    CalendarHeadCell: {},
    CalendarCell: {},
    CalendarCellTrigger: {},
    CalendarFooter: {},
    // ---------- Range calendar ----------
    RangeCalendar: {},
    RangeCalendarHeader: {},
    RangeCalendarHeading: {},
    RangeCalendarPrevButton: {},
    RangeCalendarNextButton: {},
    RangeCalendarGrid: {},
    RangeCalendarGridRow: {},
    RangeCalendarHeadCell: {},
    RangeCalendarCell: {},
    RangeCalendarCellTrigger: {},
    // ---------- Combobox ----------
    ComboboxAnchor: {},
    ComboboxTrigger: {},
    ComboboxList: {},
    ComboboxViewport: {},
    ComboboxInput: {},
    ComboboxGroup: {},
    ComboboxItem: {},
    ComboboxItemIndicator: {},
    ComboboxSeparator: {},
    ComboboxEmpty: {},
    // ---------- Command ----------
    Command: {},
    CommandInput: {},
    CommandList: {},
    CommandEmpty: {},
    CommandGroup: {},
    CommandItem: {},
    CommandSeparator: {},
    CommandShortcut: {},
    CommandFooter: {},
    CommandDialog: {},
    // ---------- Select ----------
    SelectTrigger: {},
    SelectContent: {},
    SelectItem: {},
    SelectLabel: {},
    SelectSeparator: {},
    SelectScrollUpButton: {},
    SelectScrollDownButton: {},
    // ---------- Tags input ----------
    TagsInput: {},
    TagsInputInput: {},
    TagsInputItem: {},
    TagsInputItemText: {},
    TagsInputItemDelete: {},
    // ---------- Checkbox ----------
    Checkbox: {},
    // ---------- Radio group ----------
    RadioGroup: {},
    RadioGroupItem: {},
    // ---------- Switch ----------
    Switch: {},
    // ---------- Slider ----------
    Slider: {},
};
