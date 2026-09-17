<script setup>
import { withBase } from "vitepress";
</script>

<template>
    <main class="vueda-home">
        <section class="hero" aria-labelledby="home-title">
            <div class="hero-copy">
                <p class="eyebrow">VUEDA / Django + Vue</p>
                <h1 id="home-title">Build business applications <span>with Django and Vue.</span></h1>
                <p class="intro">
                    Turn your Django models, serializers, and viewsets into Vue forms, lists, and detail screens. Add
                    workflows, permissions, and audit history, with room to make the UI your own.
                </p>
                <div class="actions">
                    <a class="button primary" :href="withBase('/tutorials/start-building.html')"
                        >Start building <span aria-hidden="true">→</span></a
                    >
                    <a class="button secondary" href="https://github.com/arrai-innovations/vueda">View on GitHub</a>
                </div>
                <p class="hero-note">For Django teams building tools their business runs on.</p>
            </div>
            <figure class="preview">
                <div class="preview-frame">
                    <div class="preview-label">
                        <span class="preview-dot" aria-hidden="true"></span> Widget Warehouse
                        <span>Example application</span>
                    </div>
                    <!-- Temporary screenshot. Replace with the finalized default list view at the same asset path. -->
                    <img
                        :src="withBase('/assets/homepage-list-preview.png')"
                        alt="Widget Warehouse inventory application showing sidebar navigation, filters, search, and widget records."
                        width="1022"
                        height="498"
                        fetchpriority="high"
                    />
                </div>
                <figcaption>
                    A VUEDA application, from navigation to records.
                    <a :href="withBase('/reference/components/views-crudl.html')"
                        >Explore the views <span aria-hidden="true">→</span></a
                    >
                </figcaption>
            </figure>
        </section>

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
                    <span class="step-number" aria-hidden="true">01</span>
                    <h3>Define your application</h3>
                    <p>Build models, serializers, and viewsets with VUEDA's Django and REST framework base classes.</p>
                </li>
                <li>
                    <span class="step-number" aria-hidden="true">02</span>
                    <h3>Let the server describe it</h3>
                    <p>
                        Register your models. VUEDA exposes metadata: information about their fields, actions, and
                        permissions.
                    </p>
                </li>
                <li>
                    <span class="step-number" aria-hidden="true">03</span>
                    <h3>Get application screens</h3>
                    <p>The Vue client uses that metadata to generate routes, forms, lists, and detail views.</p>
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
                <article>
                    <h3>Make the interface your own</h3>
                    <p>
                        Configure fields and list columns, add custom Vue views, and adjust the theme to fit your
                        application.
                    </p>
                    <a class="text-link" :href="withBase('/guides/configure-crud-views.html')"
                        >Customize your views <span aria-hidden="true">→</span></a
                    >
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
    max-width: 1440px;
    margin: 0 auto;
    padding: 0 40px;
}
.hero {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    align-items: center;
    gap: 48px;
    padding: 88px 0 80px;
}
.eyebrow {
    margin: 0 0 20px;
    color: var(--vp-c-brand-1);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
}
h1,
h2,
h3,
p,
figure {
    margin: 0;
}
h1,
h2,
h3 {
    font-family: var(--vp-font-family-base);
    font-weight: 600;
    text-wrap: balance;
}
h1 {
    font-size: clamp(38px, 3.6vw, 54px);
    line-height: 1.12;
    letter-spacing: -0.045em;
}
h1 span {
    color: var(--arrai-docs-brand);
}
.intro {
    max-width: 540px;
    margin-top: 24px;
    color: var(--vp-c-text-2);
    font-size: 18px;
    line-height: 1.65;
}
.actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 30px;
}
.button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    min-height: 46px;
    padding: 10px 20px;
    border: 1px solid transparent;
    border-radius: 6px;
    font-size: 14px;
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
.secondary {
    border-color: var(--vp-c-divider);
    background: var(--vp-c-bg-soft);
}
.secondary:hover {
    border-color: var(--vp-c-brand-1);
}
.hero-note {
    margin-top: 18px;
    color: var(--vp-c-text-2);
    font-size: 13px;
    line-height: 1.6;
}
.preview {
    min-width: 0;
}
.preview-frame {
    overflow: hidden;
    border: 1px solid var(--vp-c-divider);
    border-radius: 10px;
    background: #0b1013;
    box-shadow: 0 20px 60px -24px rgb(0 77 160 / 30%);
}
.preview-label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid #303844;
    color: #eef4fb;
    font-size: 12px;
}
.preview-label > span:last-child {
    margin-left: auto;
    color: #a6b2c0;
}
.preview-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--arrai-docs-brand);
}
.preview img {
    display: block;
    width: 100%;
    height: auto;
}
figcaption {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 8px;
    margin-top: 16px;
    color: var(--vp-c-text-2);
    font-size: 12px;
    line-height: 1.6;
}
figcaption a,
.text-link {
    color: var(--vp-c-brand-1);
    font-weight: 500;
}
.how-it-works,
.capabilities {
    padding: 56px 0;
    border-top: 1px solid var(--vp-c-divider);
}
h2 {
    font-size: clamp(26px, 2.6vw, 36px);
    line-height: 1.2;
    letter-spacing: -0.03em;
}
.section-heading > p:last-child:not(.eyebrow) {
    max-width: 660px;
    margin-top: 16px;
    color: var(--vp-c-text-2);
    line-height: 1.7;
}
.steps,
.feature-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 32px;
    margin-top: 36px;
}
.steps {
    padding: 0;
    list-style: none;
}
.step-number {
    display: block;
    margin-bottom: 14px;
    color: var(--vp-c-brand-1);
    font-family: var(--vp-font-family-mono);
    font-size: 13px;
}
h3 {
    font-size: 19px;
    line-height: 1.4;
}
.steps p,
.feature-grid p,
.get-started p:not(.eyebrow) {
    margin-top: 12px;
    color: var(--vp-c-text-2);
    font-size: 15px;
    line-height: 1.7;
}
.text-link {
    display: inline-block;
    margin-top: 24px;
    font-size: 14px;
}
.feature-grid {
    gap: 16px;
}
.feature-grid article {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 28px;
    border: 1px solid var(--vp-c-divider);
    border-radius: 8px;
    background: var(--vp-c-bg-soft);
}
.feature-grid p {
    flex-grow: 1;
}
.get-started {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 32px;
    margin: 16px 0 40px;
    padding: 36px;
    border: 1px solid var(--vp-c-divider);
    border-radius: 8px;
    background: var(--vp-c-brand-soft);
}
.get-started > div {
    max-width: 720px;
}
.get-started .button {
    flex-shrink: 0;
}
.get-started .requirements {
    font-size: 13px;
}
.doc-links {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px 24px;
    font-size: 14px;
}
.project-credit {
    margin-top: 20px;
    color: var(--vp-c-text-2);
    text-align: center;
    font-size: 12px;
}
.project-credit span {
    margin: 0 8px;
}
.project-credit .project-name {
    display: block;
    margin: 0 0 8px;
}
a:focus-visible {
    outline: 2px solid var(--vp-c-brand-1);
    outline-offset: 5px;
}
.text-link:hover,
figcaption a:hover,
.doc-links a:hover,
.project-credit a:hover {
    text-decoration: underline;
    text-underline-offset: 4px;
}
@media (max-width: 959px) {
    .hero {
        grid-template-columns: 1fr;
        gap: 40px;
        padding: 48px 0;
    }
    .hero-copy,
    .intro {
        max-width: 680px;
    }
    .steps,
    .feature-grid {
        gap: 24px;
    }
    .feature-grid {
        grid-template-columns: 1fr;
    }
    .get-started {
        align-items: flex-start;
        flex-direction: column;
    }
}
@media (max-width: 639px) {
    .vueda-home {
        padding: 0 24px;
    }
    .intro {
        font-size: 16px;
    }
    .steps {
        grid-template-columns: 1fr;
        gap: 28px;
    }
    .how-it-works,
    .capabilities {
        padding: 36px 0;
    }
    .get-started,
    .feature-grid article {
        padding: 24px;
    }
    .preview-label > span:last-child {
        display: none;
    }
}
</style>
