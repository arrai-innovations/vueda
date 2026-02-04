import { defineConfig } from 'vitepress';
import { configureDiagramsPlugin } from 'vitepress-plugin-diagrams';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sirv from 'sirv';

const base = '/vueda/';
const docsRoot = fileURLToPath(new URL('..', import.meta.url));
const generatedRoot = path.join(docsRoot, '.generated');

const walkFiles = (dir) => {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walkFiles(entryPath);
    }
    return [entryPath];
  });
};

const generatedAssetsPlugin = () => ({
  name: 'vueda-generated-assets',
  configureServer(server) {
    if (!fs.existsSync(generatedRoot)) {
      return;
    }
    server.middlewares.use(
      sirv(generatedRoot, {
        dev: true,
      })
    );
  },
  generateBundle() {
    if (!fs.existsSync(generatedRoot)) {
      return;
    }
    for (const filePath of walkFiles(generatedRoot)) {
      const relPath = path.relative(generatedRoot, filePath).split(path.sep).join('/');
      this.emitFile({
        type: 'asset',
        fileName: relPath,
        source: fs.readFileSync(filePath),
      });
    }
  },
});

const sidebarFromDir = (baseDir, baseLink) => {
  if (!fs.existsSync(baseDir)) {
    return [];
  }
  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      text: entry.name,
      link: `${baseLink}${entry.name}/`,
    }));
};

export default defineConfig({
  title: 'VUEDA',
  description: 'Implementor guide, changelog, and reference for VUEDA.',
  lastUpdated: true,
  base,
  outDir: '../site',
  head: [
    ['link', { rel: 'icon', href: `${base}assets/logo-cube.svg` }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: `${base}assets/logo-cube.png` }],
    ['link', { rel: 'apple-touch-icon', href: `${base}assets/logo-cube.png` }],
  ],
  themeConfig: {
    logo: '/assets/logo-cube.svg',
    nav: [
      { text: 'About', link: '/' },
      { text: 'Quick Start', link: '/quick-start' },
      { text: 'Guide', link: '/guide' },
      { text: 'Server', link: '/server/' },
      { text: 'Client', link: '/client/' },
      { text: 'API', link: '/api/' },
    ],
    sidebar: {
      '/server/': [
        {
          text: 'Server',
          items: [
            { text: 'Overview', link: '/server/' },
            { text: 'Implementor Guide', link: '/server/guide/implementor' },
            { text: 'Changelog', link: '/server/changelog' },
            { text: 'Reference', link: '/server/reference/' },
          ],
        },
      ],
      '/client/': [
        {
          text: 'Client',
          items: [{ text: 'Overview', link: '/client/' }],
        },
      ],
      '/api/': [
        {
          text: 'JavaScript',
          items: sidebarFromDir(path.join(docsRoot, 'api', 'js'), '/api/js/'),
        },
        {
          text: 'Python',
          items: sidebarFromDir(path.join(docsRoot, 'api', 'py'), '/api/py/'),
        },
        {
          text: 'REST',
          items: sidebarFromDir(path.join(docsRoot, 'api', 'rest'), '/api/rest/'),
        },
        {
          text: 'Vue',
          items: sidebarFromDir(path.join(docsRoot, 'api', 'vue'), '/api/vue/'),
        },
      ],
      '/': [
        {
          text: 'Documentation',
          items: [
            { text: 'About', link: '/' },
            { text: 'Guide', link: '/guide' },
            { text: 'Quick Start', link: '/quick-start' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/arrai-innovations/vueda' }],
  },
  markdown: {
    config: (md) => {
      configureDiagramsPlugin(md, {
        diagramsDir: path.join(generatedRoot, 'diagrams'),
        publicPath: `${base}diagrams`,
      });
    },
  },
  vite: {
    server: {
      // Allow reverse-proxy/custom hostnames in local dev.
      allowedHosts: true,
    },
    plugins: [generatedAssetsPlugin()],
  },
});
