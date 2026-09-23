<script setup>
import { withBase } from "vitepress";
</script>

<template>
    <main class="vueda-home">
        <section class="how-it-works" aria-labelledby="how-title">
            <div class="section-heading">
                <p class="eyebrow">How it works</p>
                <h2 id="how-title">Define it in Django. Work with it in Vue.</h2>
                <p>
                    Once your application is connected, standard model screens need no separate per-model frontend code.
                </p>
            </div>
            <ol class="steps">
                <li>
                    <h3><span class="step-number" aria-hidden="true">1.</span>Define your application</h3>
                    <p>Build models, serializers, and viewsets with VUEDA's Django and REST framework base classes.</p>
                    <div class="step-visual step-code"><slot name="define" /></div>
                </li>
                <li>
                    <h3><span class="step-number" aria-hidden="true">2.</span>Let the server describe it</h3>
                    <p>
                        Register your models. VUEDA exposes metadata: information about their fields, actions, and
                        permissions.
                    </p>
                    <div class="step-visual step-code"><slot name="describe" /></div>
                </li>
                <li>
                    <h3><span class="step-number" aria-hidden="true">3.</span>Get application screens</h3>
                    <p>The Vue client uses that metadata to generate routes, forms, lists, and detail views.</p>
                    <div class="step-visual step-image">
                        <!-- Temporary screenshot. Replace once the generated form's action labels and workflow fields are cleaned up. -->
                        <img
                            v-for="theme in ['light', 'dark']"
                            :key="theme"
                            :class="`theme-${theme}`"
                            :src="withBase(`/assets/homepage-generated-form-${theme}.png`)"
                            alt="Generated purchase order form with reference, supplier, warehouse, and date fields above editable order lines."
                            width="876"
                            height="568"
                            loading="lazy"
                        />
                    </div>
                </li>
            </ol>
            <a class="text-link" :href="withBase('/core-concepts/architecture-overview.html')"
                >Explore the architecture <span aria-hidden="true">→</span></a
            >
        </section>

        <section class="capabilities" aria-labelledby="capabilities-title">
            <div class="section-heading">
                <p class="eyebrow">Beyond editing records</p>
                <h2 id="capabilities-title">Built for the way your business works.</h2>
            </div>
            <div class="feature-grid">
                <article>
                    <h3>Give work a workflow</h3>
                    <p>
                        Define states and transitions for your records. Make approvals and other business actions part
                        of the application.
                    </p>
                    <a class="text-link" :href="withBase('/tutorials/add-workflow.html')"
                        >Add a workflow <span aria-hidden="true">→</span></a
                    >
                </article>
                <article>
                    <h3>Control access. Track changes.</h3>
                    <p>
                        Enforce model, object, and workflow permissions on the server. Inspect audit history to see what
                        changed and who changed it.
                    </p>
                    <a class="text-link" :href="withBase('/core-concepts/permission-model.html')"
                        >Understand permissions <span aria-hidden="true">→</span></a
                    >
                </article>
                <article class="feature-wide">
                    <div class="feature-text">
                        <h3>Make the interface your own</h3>
                        <p>
                            Configure fields and list columns, add custom Vue views, and adjust the theme to fit your
                            application.
                        </p>
                        <a class="text-link" :href="withBase('/guides/configure-crud-views.html')"
                            >Customize your views <span aria-hidden="true">→</span></a
                        >
                    </div>
                    <div class="feature-image">
                        <img
                            v-for="theme in ['light', 'dark']"
                            :key="theme"
                            :class="`theme-${theme}`"
                            :src="withBase(`/assets/homepage-custom-dashboard-${theme}.png`)"
                            alt="Custom Widget Warehouse dashboard with a welcome message and summary cards for stock below reorder level, overdue arrivals, suppliers under review, and open order value."
                            width="1056"
                            height="400"
                            loading="lazy"
                        />
                    </div>
                </article>
            </div>
        </section>

        <section class="get-started" aria-labelledby="start-title">
            <div>
                <p class="eyebrow">Your first application</p>
                <h2 id="start-title">Start with a working inventory model.</h2>
                <p>
                    Scaffold a project, connect Django and Vue, and build your first screens with the step-by-step
                    tutorial.
                </p>
                <p class="requirements">Built on Django REST framework, PostgreSQL, and Vue 3.</p>
            </div>
            <a class="button primary" :href="withBase('/tutorials/start-building.html')"
                >Start building <span aria-hidden="true">→</span></a
            >
        </section>

        <nav class="doc-links" aria-label="Explore the documentation">
            <a :href="withBase('/tutorials/')">Tutorials</a>
            <a :href="withBase('/guides/')">Guides</a>
            <a :href="withBase('/core-concepts/')">Core concepts</a>
            <a :href="withBase('/reference/')">Reference</a>
        </nav>
        <p class="project-credit">
            <span class="project-name">VUEDA: Vue.js User Experience for Django Administration.</span>
            <a href="https://github.com/arrai-innovations/vueda/blob/main/server/LICENSE">BSD 3-Clause license</a>
            <span aria-hidden="true">·</span>
            Built by <a href="https://arrai.com">Arrai Innovations</a>
        </p>
    </main>
</template>

<style scoped>
.vueda-home {
    max-width: 90rem;
    margin: 0 auto;
    padding: 0 2.5rem;
}
.eyebrow {
    margin: 0 0 1.25rem;
    color: var(--vp-c-brand-1);
    font-family: var(--vp-font-family-heading);
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
}
h2,
h3,
p,
figure {
    margin: 0;
}
h2,
h3 {
    font-family: var(--vp-font-family-heading);
    font-weight: 600;
    text-wrap: balance;
    letter-spacing: 0.03125rem;
}
.button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    min-height: 2.875rem;
    padding: 0.625rem 1.25rem;
    border: 0.0625rem solid transparent;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 600;
    transition:
        background-color 0.15s,
        border-color 0.15s;
}
.primary {
    background: var(--vp-button-brand-bg);
    color: var(--vp-button-brand-text);
}
.primary:hover {
    background: var(--vp-button-brand-hover-bg);
    color: var(--vp-button-brand-hover-text);
}
.primary:active {
    background: var(--vp-button-brand-active-bg);
    color: var(--vp-button-brand-active-text);
}
.dark .theme-light,
html:not(.dark) .theme-dark {
    display: none !important;
}
.text-link {
    color: var(--vp-c-brand-1);
    font-weight: 500;
}
.how-it-works,
.capabilities {
    padding: 3.5rem 0;
    border-top: 0.0625rem solid var(--vp-c-divider);
}
h2 {
    font-size: clamp(1.625rem, 2.6vw, 2.25rem);
    line-height: 1.2;
}
.section-heading > p:last-child:not(.eyebrow) {
    max-width: 41.25rem;
    margin-top: 1rem;
    color: var(--vp-c-text-2);
    line-height: 1.7;
}
.steps,
.feature-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 2rem;
    margin-top: 2.25rem;
}
.steps {
    padding: 0;
    list-style: none;
}
.steps li {
    display: flex;
    flex-direction: column;
    min-width: 0;
}
@media (min-width: 75rem) {
    /* Line up headings, text, and visuals across the columns. */
    .steps li {
        display: grid;
        grid-row: span 3;
        grid-template-rows: subgrid;
        row-gap: 0;
    }
    /* The row height comes from the tallest visual; the screenshot fills it. */
    .steps .step-image {
        aspect-ratio: auto;
    }
}
.step-visual {
    flex-grow: 1;
    min-height: 0;
    margin-top: 1.25rem;
    overflow: hidden;
    border: 0.0625rem solid var(--vp-c-divider);
    border-radius: 0.5rem;
    background: var(--vp-code-block-bg);
}
.step-code {
    display: flex;
    flex-direction: column;
}
.step-code :deep(div[class*="language-"]) {
    display: flex;
    flex-grow: 1;
    flex-direction: column;
}
.step-code :deep(.copy),
.step-code :deep(.lang) {
    display: none;
}
.step-code :deep(pre) {
    flex-grow: 1;
    margin: 0;
    padding: 1rem 1.125rem;
    overflow-x: auto;
    font-family: var(--vp-font-family-mono);
    font-size: 0.75rem;
    line-height: 1.55;
}
.step-image {
    aspect-ratio: 876 / 568;
}
.step-image img,
.feature-image img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: left top;
}
.step-number {
    margin-right: 0.5rem;
    color: var(--vp-c-brand-1);
    font-family: var(--vp-font-family-mono);
    font-weight: 500;
}
h3 {
    font-size: 1.1875rem;
    line-height: 1.4;
}
.steps p,
.feature-grid p,
.get-started p:not(.eyebrow) {
    margin-top: 0.75rem;
    color: var(--vp-c-text-2);
    font-size: 0.9375rem;
    line-height: 1.7;
}
.text-link {
    display: inline-block;
    margin-top: 1.5rem;
    font-size: 0.875rem;
}
.feature-grid {
    gap: 1rem;
}
.feature-grid article {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 1.75rem;
    border: 0.0625rem solid var(--vp-c-divider);
    border-radius: 0.5rem;
    background: var(--vp-c-bg-soft);
}
.feature-grid p {
    flex-grow: 1;
}
.feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
}
.feature-grid .feature-wide {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
    align-items: center;
    gap: 2rem;
}
.feature-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}
.feature-image {
    overflow: hidden;
    border: 0.0625rem solid var(--vp-c-divider);
    border-radius: 0.375rem;
    aspect-ratio: 1056 / 400;
}
.get-started {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    margin: 1rem 0 2.5rem;
    padding: 2.25rem;
    border: 0.0625rem solid var(--vp-c-divider);
    border-radius: 0.5rem;
    background: var(--vp-c-brand-soft);
}
.get-started > div {
    max-width: 45rem;
}
.get-started .button {
    flex-shrink: 0;
}
.get-started .requirements {
    font-size: 0.8125rem;
}
.doc-links {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem 1.5rem;
    font-size: 0.875rem;
}
.project-credit {
    margin-top: 1.25rem;
    color: var(--vp-c-text-2);
    text-align: center;
}
.project-credit span {
    margin: 0 0.5rem;
}
.project-credit .project-name {
    display: block;
    margin: 0 0 0.5rem;
}
a:focus-visible {
    outline: 0.125rem solid var(--vp-c-brand-1);
    outline-offset: 0.3125rem;
}
.text-link:hover,
.doc-links a:hover,
.project-credit a:hover {
    text-decoration: underline;
    text-underline-offset: 0.25rem;
}
@media (min-width: 40rem) and (max-width: 74.9375rem) {
    .steps {
        grid-template-columns: 1fr;
        gap: 2.5rem;
    }
    .steps li {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
        grid-template-rows: auto 1fr;
        column-gap: 2rem;
    }
    .steps li > :not(.step-visual) {
        grid-column: 1;
    }
    .steps .step-visual {
        grid-column: 2;
        grid-row: 1 / span 2;
        margin-top: 0;
    }
}
@media (max-width: 59.9375rem) {
    .steps,
    .feature-grid {
        gap: 1.5rem;
    }
    .feature-grid,
    .feature-grid .feature-wide {
        grid-template-columns: 1fr;
    }
    .get-started {
        align-items: flex-start;
        flex-direction: column;
    }
}
@media (max-width: 39.9375rem) {
    .vueda-home {
        padding: 0 1.5rem;
    }
    .steps {
        grid-template-columns: 1fr;
        gap: 1.75rem;
    }
    .how-it-works,
    .capabilities {
        padding: 2.25rem 0;
    }
    .get-started,
    .feature-grid article {
        padding: 1.5rem;
    }
}
</style>
