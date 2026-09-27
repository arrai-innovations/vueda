---
title: Date + Time
status: brainstorming
audience: designer
type: reference
---

<script setup>
import { CalendarDate, Time } from "@internationalized/date";
import DateField from "@vueda/controls/date-field/DateField.vue";
import DateFieldInput from "@vueda/controls/date-field/DateFieldInput.vue";
import DateRangeField from "@vueda/controls/date-range-field/DateRangeField.vue";
import DateRangeFieldInput from "@vueda/controls/date-range-field/DateRangeFieldInput.vue";
import TimeField from "@vueda/controls/time-field/TimeField.vue";
import TimeFieldInput from "@vueda/controls/time-field/TimeFieldInput.vue";
import Calendar from "@vueda/controls/calendar/Calendar.vue";
import CalendarFooter from "@vueda/controls/calendar/CalendarFooter.vue";
import RangeCalendar from "@vueda/controls/range-calendar/RangeCalendar.vue";
import Button from "@vueda/controls/button/Button.vue";
import DateRangeDisplay from "@vueda/display/date-display/DateRangeDisplay.vue";
import DateTimeDisplay from "@vueda/display/date-display/DateTimeDisplay.vue";
import { ref } from "vue";

const dateValue = new CalendarDate(2026, 5, 10);
const placeholderMay = new CalendarDate(2026, 5, 1);
const placeholderApr = new CalendarDate(2026, 4, 1);
const calendarSelected = ref(new CalendarDate(2026, 5, 14));
const rangeValue = { start: new CalendarDate(2026, 4, 10), end: new CalendarDate(2026, 4, 24) };
const timeValue = new Time(14, 30);
const timeValueSec = new Time(9, 45, 22);
const isDateUnavailable = (date) => [8, 15, 22].includes(date.day);
const isDateDisabled = (date) => date.day < 5;
</script>

# Date + Time

The date and time family covers segment fields for dates, date ranges, and
times, the calendar grids, and two display components.
[Components](./index.md) describes the rules every component page shares.
Each section below states the {@term Visual Contract} and links the theme
keys and tokens that hold the current values.

Focus styles on the segment fields appear only with real focus. Click into a
segment in a demo to see them.

## DateField: composition matrix

{@api vue:component:DateField} is a segment-based date input. Each date part
(year, month, day, and any time parts) is a segment that takes focus on its
own. The [default slot]{@api vue:component:DateField:slot:default} exposes
`{ segments }`, an array of objects with `part` and `value`. Render each one
with {@api vue:component:DateFieldInput}, passing its
[`part`]{@api vue:component:DateFieldInput:prop:part}. Literal parts, such as
the separators, render as text that does not take focus.

[`granularity`]{@api vue:component:DateField:prop:granularity} sets the
smallest segment shown: `"day"`, `"hour"`, `"minute"`, or `"second"`.
[`size`]{@api vue:component:DateField:prop:size} (`"sm"`, `"default"`, or
`"lg"`) picks a step on the shared control-height scale:
{@api css-token:vueda-control-height-sm},
{@api css-token:vueda-control-height}, and
{@api css-token:vueda-control-height-lg}. DateRangeField and TimeField take
the same `size` values.

The field shell is the input shell that [Inputs](./inputs.md#input-shell) describes, with
the same rest, hover, focus, read-only, disabled, invalid, and warning states.
The shell shows focus while any segment has focus. The focused segment fills
with {@api css-token:accent}, and an empty segment shows its placeholder in
{@api css-token:muted-foreground}. Segment digits keep a fixed width, so the
field does not shift as the value changes.

Theme keys: {@api theme-key:DateField}, {@api theme-key:DateFieldInput}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="date-only (default)">
    <div class="flex flex-col gap-1">
      <StateLabel>empty</StateLabel>
      <DateField>
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <DateFieldInput :part="item.part">{{ item.value }}</DateFieldInput>
          </template>
        </template>
      </DateField>
    </div>
    <div class="flex flex-col gap-1">
      <StateLabel>filled</StateLabel>
      <DateField :default-value="dateValue">
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <DateFieldInput :part="item.part">{{ item.value }}</DateFieldInput>
          </template>
        </template>
      </DateField>
    </div>
    <template #footer>
      <span>empty segments show a muted placeholder</span>
      <span>click a segment to see the focus treatment</span>
    </template>
  </DemoCard>
  <DemoCard title="datetime (granularity=&quot;minute&quot;)">
    <div class="flex flex-col gap-1">
      <StateLabel>empty</StateLabel>
      <DateField granularity="minute">
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <DateFieldInput :part="item.part">{{ item.value }}</DateFieldInput>
          </template>
        </template>
      </DateField>
    </div>
    <div class="flex flex-col gap-1">
      <StateLabel>with seconds</StateLabel>
      <DateField granularity="second">
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <DateFieldInput :part="item.part">{{ item.value }}</DateFieldInput>
          </template>
        </template>
      </DateField>
    </div>
    <template #footer>
      <span>granularity controls which segments appear</span>
      <span>accepts "day" | "hour" | "minute" | "second"</span>
    </template>
  </DemoCard>
  <DemoCard title="read modes">
    <div class="flex flex-col gap-1">
      <StateLabel>readonly</StateLabel>
      <DateField :default-value="dateValue" readonly>
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <DateFieldInput :part="item.part">{{ item.value }}</DateFieldInput>
          </template>
        </template>
      </DateField>
    </div>
    <div class="flex flex-col gap-1">
      <StateLabel>disabled</StateLabel>
      <DateField :default-value="dateValue" disabled>
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <DateFieldInput :part="item.part">{{ item.value }}</DateFieldInput>
          </template>
        </template>
      </DateField>
    </div>
    <template #footer>
      <span>read-only drops the editable field surface</span>
      <span>disabled is an inert surface that takes no input</span>
    </template>
  </DemoCard>
  <DemoCard title="invalid">
    <DateField aria-invalid="true">
      <template #default="{ segments }">
        <template v-for="item in segments" :key="item.part">
          <DateFieldInput :part="item.part">{{ item.value }}</DateFieldInput>
        </template>
      </template>
    </DateField>
    <template #footer>
      <span><code>aria-invalid="true"</code> marks the edge in the destructive color</span>
    </template>
  </DemoCard>
  <DemoCard title="size variants">
    <div class="flex flex-col gap-1">
      <StateLabel>sm</StateLabel>
      <DateField :default-value="dateValue" size="sm">
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <DateFieldInput :part="item.part">{{ item.value }}</DateFieldInput>
          </template>
        </template>
      </DateField>
    </div>
    <div class="flex flex-col gap-1">
      <StateLabel>default</StateLabel>
      <DateField :default-value="dateValue">
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <DateFieldInput :part="item.part">{{ item.value }}</DateFieldInput>
          </template>
        </template>
      </DateField>
    </div>
    <div class="flex flex-col gap-1">
      <StateLabel>lg</StateLabel>
      <DateField :default-value="dateValue" size="lg">
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <DateFieldInput :part="item.part">{{ item.value }}</DateFieldInput>
          </template>
        </template>
      </DateField>
    </div>
    <template #footer>
      <span>steps on the shared control-height scale</span>
      <span>also accepted by DateRangeField and TimeField</span>
    </template>
  </DemoCard>
</VuedaDemo>

## DateRangeField: composition matrix

{@api vue:component:DateRangeField} extends the segment pattern to a start
and end pair in one shell. Its
[default slot]{@api vue:component:DateRangeField:slot:default} exposes
`{ segments }` as `{ start: [...], end: [...] }`. Render each array with
{@api vue:component:DateRangeFieldInput}, passing `part` and
[`type`]{@api vue:component:DateRangeFieldInput:prop:type} (`"start"` or
`"end"`). The component renders no separator between the two halves, so add
your own markup, such as a `<span>`. The shell and segments follow DateField.

Theme keys: {@api theme-key:DateRangeField},
{@api theme-key:DateRangeFieldInput}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="default">
    <div class="flex flex-col gap-1">
      <StateLabel>empty</StateLabel>
      <DateRangeField>
        <template #default="{ segments }">
          <template v-for="item in segments.start" :key="`s-${item.part}`">
            <DateRangeFieldInput :part="item.part" type="start">{{ item.value }}</DateRangeFieldInput>
          </template>
          <span class="text-muted-foreground px-1" aria-hidden="true">&ndash;</span>
          <template v-for="item in segments.end" :key="`e-${item.part}`">
            <DateRangeFieldInput :part="item.part" type="end">{{ item.value }}</DateRangeFieldInput>
          </template>
        </template>
      </DateRangeField>
    </div>
    <div class="flex flex-col gap-1">
      <StateLabel>filled</StateLabel>
      <DateRangeField :default-value="rangeValue">
        <template #default="{ segments }">
          <template v-for="item in segments.start" :key="`s-${item.part}`">
            <DateRangeFieldInput :part="item.part" type="start">{{ item.value }}</DateRangeFieldInput>
          </template>
          <span class="text-muted-foreground px-1" aria-hidden="true">&ndash;</span>
          <template v-for="item in segments.end" :key="`e-${item.part}`">
            <DateRangeFieldInput :part="item.part" type="end">{{ item.value }}</DateRangeFieldInput>
          </template>
        </template>
      </DateRangeField>
    </div>
    <template #footer>
      <span>start and end share the same container chrome</span>
      <span>separator is consumer markup</span>
    </template>
  </DemoCard>
  <DemoCard title="read modes">
    <div class="flex flex-col gap-1">
      <StateLabel>readonly</StateLabel>
      <DateRangeField :default-value="rangeValue" readonly>
        <template #default="{ segments }">
          <template v-for="item in segments.start" :key="`s-${item.part}`">
            <DateRangeFieldInput :part="item.part" type="start">{{ item.value }}</DateRangeFieldInput>
          </template>
          <span class="text-muted-foreground px-1" aria-hidden="true">&ndash;</span>
          <template v-for="item in segments.end" :key="`e-${item.part}`">
            <DateRangeFieldInput :part="item.part" type="end">{{ item.value }}</DateRangeFieldInput>
          </template>
        </template>
      </DateRangeField>
    </div>
    <div class="flex flex-col gap-1">
      <StateLabel>disabled</StateLabel>
      <DateRangeField :default-value="rangeValue" disabled>
        <template #default="{ segments }">
          <template v-for="item in segments.start" :key="`s-${item.part}`">
            <DateRangeFieldInput :part="item.part" type="start">{{ item.value }}</DateRangeFieldInput>
          </template>
          <span class="text-muted-foreground px-1" aria-hidden="true">&ndash;</span>
          <template v-for="item in segments.end" :key="`e-${item.part}`">
            <DateRangeFieldInput :part="item.part" type="end">{{ item.value }}</DateRangeFieldInput>
          </template>
        </template>
      </DateRangeField>
    </div>
    <template #footer>
      <span>read-only drops the editable field surface</span>
      <span>disabled is an inert surface that takes no input</span>
    </template>
  </DemoCard>
</VuedaDemo>

## TimeField: composition matrix

{@api vue:component:TimeField} renders hour and minute segments.
[`granularity`]{@api vue:component:TimeField:prop:granularity} (`"hour"`,
`"minute"`, or `"second"`) sets the smallest segment, and
[`hourCycle`]{@api vue:component:TimeField:prop:hourCycle} set to `12` adds an
AM/PM segment. The slot matches DateField: `{ segments }` is a flat array,
rendered with {@api vue:component:TimeFieldInput}. The shell and segments
follow DateField.

Theme keys: {@api theme-key:TimeField}, {@api theme-key:TimeFieldInput}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="24-hour">
    <div class="flex flex-col gap-1">
      <StateLabel>empty (hour:minute)</StateLabel>
      <TimeField :hour-cycle="24">
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <TimeFieldInput :part="item.part">{{ item.value }}</TimeFieldInput>
          </template>
        </template>
      </TimeField>
    </div>
    <div class="flex flex-col gap-1">
      <StateLabel>with seconds</StateLabel>
      <TimeField :hour-cycle="24" granularity="second" :default-value="timeValueSec">
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <TimeFieldInput :part="item.part">{{ item.value }}</TimeFieldInput>
          </template>
        </template>
      </TimeField>
    </div>
    <template #footer>
      <span>granularity controls which segments appear</span>
      <span>colons are literal segments</span>
    </template>
  </DemoCard>
  <DemoCard title="12-hour">
    <div class="flex flex-col gap-1">
      <StateLabel>empty</StateLabel>
      <TimeField :hour-cycle="12">
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <TimeFieldInput :part="item.part">{{ item.value }}</TimeFieldInput>
          </template>
        </template>
      </TimeField>
    </div>
    <div class="flex flex-col gap-1">
      <StateLabel>filled</StateLabel>
      <TimeField :hour-cycle="12" :default-value="timeValue">
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <TimeFieldInput :part="item.part">{{ item.value }}</TimeFieldInput>
          </template>
        </template>
      </TimeField>
    </div>
    <template #footer>
      <span>AM/PM segment appended when hourCycle=12</span>
      <span>click a segment to see the focus treatment</span>
    </template>
  </DemoCard>
  <DemoCard title="read modes">
    <div class="flex flex-col gap-1">
      <StateLabel>readonly</StateLabel>
      <TimeField :default-value="timeValue" :hour-cycle="24" readonly>
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <TimeFieldInput :part="item.part">{{ item.value }}</TimeFieldInput>
          </template>
        </template>
      </TimeField>
    </div>
    <div class="flex flex-col gap-1">
      <StateLabel>disabled</StateLabel>
      <TimeField :default-value="timeValue" :hour-cycle="24" disabled>
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <TimeFieldInput :part="item.part">{{ item.value }}</TimeFieldInput>
          </template>
        </template>
      </TimeField>
    </div>
    <template #footer>
      <span>read-only drops the editable field surface</span>
      <span>disabled is an inert surface that takes no input</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Calendar: state matrix

{@api vue:component:Calendar} renders its header, navigation buttons,
weekday row, and date grid itself. Bind the selected date with `v-model`. The
[`layout`]{@api vue:component:Calendar:prop:layout} prop sets the heading: a
text label by default, `"month-and-year"` for month and year dropdowns,
`"month-only"` for a month dropdown, or `"year-only"` for a year dropdown.
[`isDateDisabled`]{@api vue:component:Calendar:prop:isDateDisabled} and
[`isDateUnavailable`]{@api vue:component:Calendar:prop:isDateUnavailable} mark
single days.

The calendar has no border, shadow, or footer of its own. The host surface,
such as a popover, supplies the edge, and CalendarFooter adds a footer. Each
day shows one state:

- Selected: {@api css-token:primary} fill with
  {@api css-token:primary-foreground} text.
- Today, when not selected: {@api css-token:accent} fill.
- Outside the shown month, or disabled: {@api css-token:muted-foreground}
  text. Disabled days cannot be selected.
- Unavailable: {@api css-token:destructive} text, struck through.

A disabled calendar shows every day as disabled and turns off its navigation
buttons.

Theme keys: {@api theme-key:Calendar}, {@api theme-key:CalendarCell},
{@api theme-key:CalendarCellTrigger}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="default (today highlighted)">
    <Calendar :default-placeholder="placeholderMay" />
    <template #footer>
      <span>today is highlighted</span>
      <span>no selection</span>
    </template>
  </DemoCard>
  <DemoCard title="with selected date">
    <Calendar v-model="calendarSelected" :default-placeholder="placeholderMay" />
    <template #footer>
      <span>the selected day takes the primary fill</span>
    </template>
  </DemoCard>
  <DemoCard title="month-and-year layout">
    <Calendar layout="month-and-year" :default-placeholder="placeholderMay" />
    <template #footer>
      <span>layout="month-and-year" replaces static heading with dropdowns</span>
      <span>also accepts "month-only" and "year-only"</span>
    </template>
  </DemoCard>
  <DemoCard title="unavailable dates">
    <Calendar :default-placeholder="placeholderMay" :is-date-unavailable="isDateUnavailable" />
    <template #footer>
      <span>unavailable days are struck through in the destructive color</span>
      <span>days 8, 15, 22 marked unavailable in this demo</span>
    </template>
  </DemoCard>
  <DemoCard title="disabled dates">
    <Calendar :default-placeholder="placeholderMay" :is-date-disabled="isDateDisabled" />
    <template #footer>
      <span>disabled days are muted and cannot be selected</span>
      <span>days before the 5th disabled in this demo</span>
    </template>
  </DemoCard>
  <DemoCard title="disabled calendar">
    <Calendar :default-placeholder="placeholderMay" disabled />
    <template #footer>
      <span>every day shows the disabled state</span>
      <span>navigation buttons and days do not respond</span>
    </template>
  </DemoCard>
</VuedaDemo>

## RangeCalendar: state matrix

{@api vue:component:RangeCalendar} selects a start and end date. The days
from start to end form one continuous {@api css-token:accent} strip, painted
on each {@api vue:component:RangeCalendarCell} so the strip rounds only at its
outer ends. The two endpoint days fill with {@api css-token:primary}. Other
day states follow Calendar.

Theme keys: {@api theme-key:RangeCalendar},
{@api theme-key:RangeCalendarCell}, {@api theme-key:RangeCalendarCellTrigger}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="with range (Apr 10 to Apr 24)">
    <RangeCalendar :default-value="rangeValue" :default-placeholder="placeholderApr" />
    <template #footer>
      <span>the range forms one strip with the accent fill</span>
      <span>endpoints take the primary fill</span>
      <span>the strip rounds at its start and end</span>
    </template>
  </DemoCard>
  <DemoCard title="default (empty, today highlighted)">
    <RangeCalendar :default-placeholder="placeholderMay" />
    <template #footer>
      <span>today is highlighted</span>
      <span>click to start a selection</span>
    </template>
  </DemoCard>
</VuedaDemo>

## CalendarFooter

{@api vue:component:CalendarFooter} is the footer below a Calendar or
RangeCalendar in a date picker popover. Its
[`summary`]{@api vue:component:CalendarFooter:slot:summary} slot holds a
leading status line, such as the selected range, and its
[`actions`]{@api vue:component:CalendarFooter:slot:actions} slot holds the
trailing buttons. The
[default slot]{@api vue:component:CalendarFooter:slot:default} replaces both.

A {@api css-token:border} divider separates the footer from the grid above.
The summary reads as status text in {@api css-token:muted-foreground}, and its
digits keep a fixed width, as segment digits do.

Theme keys: {@api theme-key:CalendarFooter}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="range summary + actions">
    <RangeCalendar :default-value="rangeValue" :default-placeholder="placeholderApr" />
    <CalendarFooter>
      <template #summary>Apr 10, 2026 → Apr 24, 2026 · 14 days</template>
      <template #actions>
        <Button emphasis="ghost" size="sm">Clear</Button>
        <Button size="sm" tone="primary">Apply</Button>
      </template>
    </CalendarFooter>
    <template #footer>
      <span>summary digits keep a fixed width</span>
      <span>a divider separates the footer from the grid</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Display components

{@api vue:component:DateTimeDisplay} and {@api vue:component:DateRangeDisplay}
render a value as formatted text that cannot be edited.

DateTimeDisplay's [`value`]{@api vue:component:DateTimeDisplay:prop:value}
accepts an ISO string, a {@api ext:mdn:Date}, or a Luxon
{@api ext:luxon:DateTime}. DateRangeDisplay's
[`start`]{@api vue:component:DateRangeDisplay:prop:start} and
[`end`]{@api vue:component:DateRangeDisplay:prop:end} accept an ISO string or
a Luxon `DateTime`. ISO strings and `Date` values render in the reader's time
zone, so the demo text below depends on where you open the page.
DateTimeDisplay always formats with the `en-CA` locale. DateRangeDisplay takes
a [`locale`]{@api vue:component:DateRangeDisplay:prop:locale} prop, which
defaults to `en-CA`.

DateTimeDisplay's [`format`]{@api vue:component:DateTimeDisplay:prop:format}
sets the layout:

- `"inline"` (default): the absolute value, then the relative label in
  parentheses.
- `"break"`: the relative label on a second line.
- `"absolute"`: the absolute value, with the relative label as its tooltip.
- `"relative"`: the relative label, with the absolute value as its tooltip.
- `"default"`, or a custom Luxon format string or options object: the
  absolute value, with a tooltip formatted by
  [`tooltipFormat`]{@api vue:component:DateTimeDisplay:prop:tooltipFormat}.

Set [`showRelative`]{@api vue:component:DateTimeDisplay:prop:showRelative},
[`showTime`]{@api vue:component:DateTimeDisplay:prop:showTime}, or
[`showTooltip`]{@api vue:component:DateTimeDisplay:prop:showTooltip} to
`false` to drop the relative label, the time, or the tooltip.
[`inline`]{@api vue:component:DateTimeDisplay:prop:inline} renders the value
without a wrapping element, so it sits in the surrounding text.

The relative label ("2 days ago") counts from now and refreshes on a timer.
The first card below turns it off so its output stays stable, and the second
card shows it.

DateRangeDisplay renders a range on one day as a single date, and shows the
month and year once when both ends share them.
[`showTime`]{@api vue:component:DateRangeDisplay:prop:showTime} adds the time
to a single-day range.

Theme keys: {@api theme-key:DateTimeDisplay}, {@api theme-key:DateRangeDisplay}.

<VuedaDemo class="grid gap-6 sm:grid-cols-2">
  <DemoCard title="DateTimeDisplay" description=" (absolute only, deterministic)">
    <div class="flex flex-col gap-2 text-sm">
      <DateTimeDisplay value="2026-04-12T14:30:00Z" :show-relative="false" :show-tooltip="false" />
      <DateTimeDisplay value="2026-04-12T14:30:00Z" :show-relative="false" :show-tooltip="false" :show-time="false" />
    </div>
    <template #footer>
      <span>first row is the default absolute output; second sets <code>:show-time="false"</code> to drop the time portion</span>
      <span><code>:show-relative="false"</code> suppresses the clock-dependent label, which is what makes these two rows stable</span>
    </template>
  </DemoCard>
  <DemoCard title="DateTimeDisplay" description=" (with the relative label)">
    <div class="flex flex-col gap-2 text-sm">
      <DateTimeDisplay value="2026-04-12T14:30:00Z" :show-tooltip="false" />
      <DateTimeDisplay format="relative" value="2026-04-12T14:30:00Z" :show-tooltip="false" />
    </div>
    <template #footer>
      <span>the parenthesised label counts from now, so it reads differently every time this page loads</span>
      <span><code>format="relative"</code> drops the absolute part and keeps only that label</span>
      <span>the label refreshes on a timer, every minute and every second for very recent values</span>
    </template>
  </DemoCard>
  <DemoCard title="DateTimeDisplay" description=" (inline in a sentence)">
    <p class="text-sm">
      Invoice INV-2026-0418 was issued
      <DateTimeDisplay inline value="2026-04-12T14:30:00Z" :show-relative="false" :show-tooltip="false" />
      and is due on
      <DateTimeDisplay inline value="2026-05-12T14:30:00Z" :show-relative="false" :show-time="false" :show-tooltip="false" />.
    </p>
    <template #footer>
      <span><code>inline</code> drops the wrapping element so the value sits in the text flow instead of forming its own block</span>
    </template>
  </DemoCard>
  <DemoCard title="DateRangeDisplay" description=" (collapses redundant segments)">
    <div class="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-2 text-sm">
      <StateLabel>same day</StateLabel>
      <DateRangeDisplay end="2026-04-01" start="2026-04-01" />
      <StateLabel>same month</StateLabel>
      <DateRangeDisplay end="2026-04-30" start="2026-04-01" />
      <StateLabel>same year</StateLabel>
      <DateRangeDisplay end="2026-09-08" start="2026-04-01" />
      <StateLabel>across years</StateLabel>
      <DateRangeDisplay end="2027-01-06" start="2026-12-28" />
    </div>
    <template #footer>
      <span>a range on one day renders as a single date</span>
      <span>the year appears once when both ends share it, and the month once when both ends share that too</span>
      <span>pass <code>:show-time="true"</code> to add the time to a single-day range</span>
    </template>
  </DemoCard>
</VuedaDemo>
