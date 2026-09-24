<script setup>
import { CurveType, StackedBar } from "@unovis/ts";
import {
    VisAxis,
    VisBulletLegend,
    VisCrosshair,
    VisLine,
    VisStackedBar,
    VisTooltip,
    VisXYContainer,
} from "@unovis/vue";
import "@vueda/theme/vueda-tailwind/unovis.css";

const data = [
    { week: 1, north: 12, south: 7 },
    { week: 2, north: 9, south: 11 },
    { week: 3, north: 15, south: 8 },
    { week: 4, north: 18, south: 12 },
];
const x = (row) => row.week;
const y = [(row) => row.north, (row) => row.south];
const colors = ["var(--vueda-chart-1)", "var(--vueda-chart-2)"];
const color = (_, index) => colors[index];
const dash = (_, index) => (index === 0 ? [] : [7, 3]);
const items = [
    { name: "North", color: colors[0] },
    { name: "South", color: colors[1] },
];
function tooltip(row) {
    const node = document.createElement("div");
    node.style.fontSize = "var(--vueda-text-supporting)";
    node.textContent = `Week ${row.week}: North ${row.north}, South ${row.south}`;
    return node;
}
const barTriggers = { [StackedBar.selectors.bar]: (bar) => tooltip(bar.datum) };
</script>

<template>
    <div class="flex flex-col gap-6">
        <div class="unovis-vueda bg-card text-card-foreground rounded border border-solid border-[var(--border)] p-4">
            <p class="mb-2 text-sm font-medium">Default chart colors</p>
            <VisXYContainer :data="data" :height="200" :y-domain="[0, undefined]">
                <VisStackedBar :x="x" :y="y" :color="color" :bar-padding="0.4" />
                <VisAxis type="x" :tick-values="[1, 2, 3, 4]" :grid-line="false" />
                <VisAxis type="y" :num-ticks="4" :domain-line="false" />
                <VisTooltip :triggers="barTriggers" />
            </VisXYContainer>
            <VisBulletLegend :items="items" />
        </div>
        <div
            class="unovis-vueda bg-card text-card-foreground rounded border border-solid border-[var(--border)] p-4"
            style="--vueda-chart-1: var(--vueda-chart-5)"
        >
            <p class="mb-2 text-sm font-medium">Local override: North uses palette slot 5</p>
            <VisXYContainer :data="data" :height="200" :y-domain="[0, undefined]">
                <VisLine :x="x" :y="y" :color="color" :line-dash-array="dash" :curve-type="CurveType.Linear" />
                <VisAxis type="x" :tick-values="[1, 2, 3, 4]" :grid-line="false" />
                <VisAxis type="y" :num-ticks="4" :domain-line="false" />
                <VisCrosshair :x="x" :y="y" :color="color" :template="tooltip" />
                <VisTooltip />
            </VisXYContainer>
            <VisBulletLegend :items="items" />
        </div>
        <table>
            <caption>
                Order counts used by both charts
            </caption>
            <thead>
                <tr>
                    <th scope="col">Week</th>
                    <th scope="col">North (solid line)</th>
                    <th scope="col">South (dashed line)</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="row in data" :key="row.week">
                    <th scope="row">{{ row.week }}</th>
                    <td>{{ row.north }}</td>
                    <td>{{ row.south }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
