import { load as loadYaml } from 'js-yaml'
import fs from 'node:fs'
import path from 'node:path'
import { PluginOption } from 'vite'

// we need to use relative import from atlas-meta-server because of an issue in Vite: https://github.com/vitejs/vite/issues/5370
import { generateCommonMetaTags, generateMetaHtml } from '../../atlas-meta-server/src/tags'
import { configSchema } from '../src/config/configSchema'

// read config file - we cannot use `@/config` since it relies on YAML plugin being already loaded and that's not done in this context
const rawConfigPath = path.resolve(__dirname, '..', 'atlas.config.yml')
const rawConfigText = fs.readFileSync(rawConfigPath, 'utf-8')
const rawConfig = loadYaml(rawConfigText)
const parsedConfig = configSchema.parse(rawConfig)

// This plugin fixes https://github.com/Joystream/atlas/issues/3005
// By default vite was transpiling `import.meta.url` (that you can find in `node_modules/@polkadot/api/packageInfo.js`)
// to the code which uses `document.baseURI`. `Document` is not available in workers and in the result we got reference errors.
// This plugin replace `document.baseURI` with `self.location.href` which should be available in the worker
export const PolkadotWorkerMetaFixPlugin: PluginOption = {
  name: 'resolve-import-meta-polkadot',
  resolveImportMeta(_, { chunkId }) {
    if (chunkId.includes('polkadot-worker')) {
      return 'self.location.href'
    }
  },
}

// This plugin overrides the name property in manifest.webmanifest file
export const AtlasWebmanifestPlugin: PluginOption = {
  name: 'atlas-webmanifest',
  buildStart() {
    const inputManifestPath = path.resolve('src/public/manifest.webmanifest')
    const manifestData = JSON.parse(fs.readFileSync(inputManifestPath, `utf-8`))

    Object.assign(manifestData, {
      name: parsedConfig.general.appName,
    })

    try {
      this.emitFile({
        type: 'asset',
        source: JSON.stringify(manifestData, null, 2),
        fileName: path.normalize('manifest.webmanifest'),
      })
    } catch (err) {
      throw new Error('Failed to emit asset file, possibly a naming conflict?')
    }
  },
}

// This plugin replaces <meta-tags /> in index.html with the actual meta tags
export const AtlasHtmlMetaTagsPlugin: PluginOption = {
  name: 'atlas-html-meta-tags',
  transformIndexHtml: {
    enforce: 'pre',
    transform: (html: string) => {
      const metaTags = generateCommonMetaTags(
        parsedConfig.general.appName,
        parsedConfig.general.appUrl,
        parsedConfig.general.appName,
        parsedConfig.general.appDescription,
        parsedConfig.general.appOgImgPath,
        parsedConfig.general.appTwitterId
      )
      const titleHtml = `<title>${parsedConfig.general.appName}</title>`
      const metaHtml = generateMetaHtml(metaTags, true)
      const finalMetaHtml = [titleHtml, metaHtml].join('\n')
      return html.replace('<meta-tags />', finalMetaHtml)
    },
  },
}

// This plugin enables /embedded path in development mode.
// Without this, dev server will always try to serve main index.html file
export const EmbeddedFallbackPlugin: PluginOption = {
  name: 'embedded-fallback',
  configureServer(server) {
    server.middlewares.use('/embedded', (req, res, next) => {
      if (req.url?.includes('.')) {
        next()
        return
      }
      req.url = '/index.html'
      req.originalUrl = '/embedded/index.html'
      next()
    })
  },
}
