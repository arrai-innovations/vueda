import { defineConfig } from 'vitepress';

const base = '/vueda/';

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
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href:
          'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap',
      },
    ],
    ['script', { src: '/assets/mermaid/mermaid.min.js' }],
  ],
  themeConfig: {
    logo: '/assets/logo-cube.svg',
    nav: [
      { text: 'About', link: '/' },
      { text: 'Guide', link: '/guide' },
      { text: 'Quick Start', link: '/quick-start' },
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
      const defaultFence = md.renderer.rules.fence;
      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        const info = token.info.trim();
        if (info === 'mermaid') {
          return `<div class="mermaid">${token.content}</div>`;
        }
        if (defaultFence) {
          return defaultFence(tokens, idx, options, env, self);
        }
        return self.renderToken(tokens, idx, options);
      };
    },
  },
});
