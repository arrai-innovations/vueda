import { defineConfig } from 'vitepress';
import { configureDiagramsPlugin } from 'vitepress-plugin-diagrams';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sirv from 'sirv';

const base = '/vueda/';
const docsRoot = fileURLToPath(new URL('..', import.meta.url));
const generatedRoot = path.join(docsRoot, '.generated');
const apiRoot = path.join(docsRoot, 'reference', 'api');

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

const parseFrontmatter = (raw) => {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) {
    return { frontmatter: {}, body: raw };
  }
  const frontmatter = {};
  const lines = match[1].split(/\r?\n/);
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    if (value.startsWith('"')) {
      try {
        frontmatter[key] = JSON.parse(value);
      } catch {
        frontmatter[key] = value.replace(/^"|"$/g, '');
      }
    } else if (value.startsWith("'")) {
      frontmatter[key] = value.replace(/^'|'$/g, '');
    } else {
      frontmatter[key] = value;
    }
  }
  return { frontmatter, body: raw.slice(match[0].length) };
};

const extractHeading = (body) => {
  const match = body.match(/^#\s+(.+)\s*$/m);
  return match ? match[1].trim() : null;
};

const apiPathForFile = (filePath) => {
  const rel = path.relative(apiRoot, filePath).split(path.sep).join('/');
  if (rel.endsWith('/index.md')) {
    return `/reference/api/${rel.slice(0, -'index.md'.length)}`;
  }
  if (rel === 'index.md') {
    return '/reference/api/';
  }
  return `/reference/api/${rel}`;
};

const buildApiIndex = () => {
  const index = new Map();
  if (!fs.existsSync(apiRoot)) {
    return index;
  }
  const files = walkFiles(apiRoot).filter((file) => file.endsWith('.md'));
  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(raw);
    if (!frontmatter.id) {
      continue;
    }
    if (index.has(frontmatter.id)) {
      throw new Error(`Duplicate API id: ${frontmatter.id}`);
    }
    const title = frontmatter.title || extractHeading(body) || frontmatter.id;
    index.set(frontmatter.id, {
      href: apiPathForFile(filePath),
      title,
      filePath,
    });
  }
  return index;
};

const apiIndex = buildApiIndex();

const apiLinkPlugin = (md, options = {}) => {
  const resolve = options.resolve;
  const strict = options.strict !== false;
  const softbreakSpacer = ' ';
  const parseApiLink = (src, pos) => {
    const prefix = '{@api';
    if (!src.startsWith(prefix, pos)) {
      return null;
    }

    let i = pos + prefix.length;
    if (i >= src.length || !/\s/.test(src[i])) {
      return null;
    }

    while (i < src.length && /\s/.test(src[i])) {
      i += 1;
    }

    const idStart = i;
    let braceDepth = 0;

    while (i < src.length) {
      const char = src[i];
      if (char === '{') {
        braceDepth += 1;
        i += 1;
        continue;
      }
      if (char === '}') {
        if (braceDepth === 0) {
          const raw = src.slice(pos, i + 1);
          const rawId = src.slice(idStart, i).trim();
          if (!rawId) {
            return null;
          }
          return { raw, rawId, length: raw.length };
        }
        braceDepth -= 1;
      }
      i += 1;
    }

    return null;
  };

  md.inline.ruler.before('emphasis', 'vueda-api-link', (state, silent) => {
    const { pos } = state;
    if (state.src.charCodeAt(pos) !== 0x7b) {
      return false;
    }
    const parsed = parseApiLink(state.src, pos);
    if (!parsed) {
      return false;
    }
    if (silent) {
      return true;
    }

    const { raw, rawId, length } = parsed;
    const entry = resolve ? resolve(rawId) : null;
    if (!entry) {
      const hint = state.env?.relativePath || state.env?.path || 'unknown file';
      const message = `Unknown API id "${rawId}" in ${hint}`;
      if (strict) {
        throw new Error(message);
      }
      const token = state.push('text', '', 0);
      token.content = raw;
      state.pos += length;
      return true;
    }

    const open = state.push('link_open', 'a', 1);
    open.attrs = [['href', entry.href]];
    const text = state.push('text', '', 0);
    text.content = entry.title || rawId;
    state.push('link_close', 'a', -1);

    let nextPos = pos + length;
    const char = state.src.charCodeAt(nextPos);
    if (char === 0x0a || char === 0x0d) {
      if (char === 0x0d) {
        nextPos += 1;
        if (state.src.charCodeAt(nextPos) === 0x0a) {
          nextPos += 1;
        }
      } else {
        nextPos += 1;
      }
      while (nextPos < state.src.length) {
        const code = state.src.charCodeAt(nextPos);
        if (code !== 0x20 && code !== 0x09) {
          break;
        }
        nextPos += 1;
      }
      const spacer = state.push('text', '', 0);
      spacer.content = softbreakSpacer;
    }

    state.pos = nextPos;
    return true;
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
  srcExclude: ['**/AGENTS.md', '**/CONTENT_PLAN.md'],
  head: [
    ['link', { rel: 'icon', href: `${base}assets/logo-cube.svg` }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: `${base}assets/logo-cube.png` }],
    ['link', { rel: 'apple-touch-icon', href: `${base}assets/logo-cube.png` }],
  ],
  themeConfig: {
    logo: '/assets/logo-cube.svg',
    nav: [
      { text: 'About', link: '/' },
      { text: 'Start Building', link: '/start-building' },
      { text: 'Guides', link: '/guides' },
      { text: 'Core Concepts', link: '/core-concepts' },
      { text: 'Reference', link: '/reference' },
    ],
    sidebar: {

      '/concepts/': [
        {
          text: 'Concepts',
          items: [
            { text: 'Overview', link: '/concepts/' },
            { text: 'Architecture', link: '/concepts/architecture' },
            { text: 'Design Principles', link: '/concepts/design-principles' },
            { text: 'Server-Client Contract', link: '/concepts/server-client-contract' },
          ],
        },
      ],
      '/how-to/': [
        {
          text: 'How-to',
          items: [
            { text: 'Overview', link: '/how-to/' },
            { text: 'Add a Resource End-to-End', link: '/how-to/add-resource' },
            { text: 'Install/Integrate Server', link: '/how-to/server-install' },
            { text: 'Install/Integrate Client', link: '/how-to/client-install' },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Overview', link: '/reference/' },
            { text: 'Configuration Surface', link: '/reference/configuration' },
            { text: 'Glossary', link: '/reference/glossary' },
          ],
        },
      ],
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
      // '/reference/api/': [
      //   {
      //     text: 'JavaScript',
      //     items: sidebarFromDir(path.join(docsRoot, 'reference', 'api', 'js'), '/reference/api/js/'),
      //   },
      //   {
      //     text: 'Python',
      //     items: sidebarFromDir(path.join(docsRoot, 'reference', 'api', 'py'), '/reference/api/py/'),
      //   },
      //   {
      //     text: 'REST',
      //     items: sidebarFromDir(path.join(docsRoot, 'reference', 'api', 'rest'), '/reference/api/rest/'),
      //   },
      //   {
      //     text: 'Vue',
      //     items: sidebarFromDir(path.join(docsRoot, 'reference', 'api', 'vue'), '/reference/api/vue/'),
      //   },
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/arrai-innovations/vueda' }],
  },
  markdown: {
    config: (md) => {
      configureDiagramsPlugin(md, {
        diagramsDir: path.join(generatedRoot, 'diagrams'),
        publicPath: `${base}diagrams`,
      });
      md.use(apiLinkPlugin, {
        resolve: (id) => apiIndex.get(id),
        strict: process.env.NODE_ENV === 'production',
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
