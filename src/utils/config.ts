import { existsSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { LoadConfigResult, LoadConfigSource } from 'unconfig'
import { createConfigLoader as createLoader } from 'unconfig'
import type { Resolver } from '@nuxt/kit'
import type { DateAdapter, ExternalVuetifyOptions, MOptions, VOptions } from '../types'
import type { ResolvedIcons } from './icons'
import type { VuetifyComponentsImportMap } from './module'

export interface VuetifyNuxtContext {
  resolver: Resolver
  logger: ReturnType<typeof import('@nuxt/kit')['useLogger']>
  moduleOptions: MOptions
  vuetifyOptions: VOptions
  vuetifyFilesToWatch: string[]
  isDev: boolean
  i18n: boolean
  isSSR: boolean
  unocss: boolean
  dateAdapter?: DateAdapter
  icons: ResolvedIcons
  componentsPromise: Promise<VuetifyComponentsImportMap>
  labComponentsPromise: Promise<VuetifyComponentsImportMap>
}

export async function loadVuetifyConfiguration<U extends ExternalVuetifyOptions>(
  cwd = process.cwd(),
  configOrPath: string | U = cwd,
  defaults: VOptions = {},
  extraConfigSources: LoadConfigSource[] = [],
): Promise<LoadConfigResult<U>> {
  let inlineConfig = {} as U
  if (typeof configOrPath !== 'string') {
    inlineConfig = configOrPath
    configOrPath = process.cwd()
  }

  const resolved = resolve(cwd, configOrPath)

  let isFile = false
  if (existsSync(resolved) && statSync(resolved).isFile()) {
    isFile = true
    cwd = dirname(resolved).replace(/\\/g, '/')
  }

  const rewrite = <U>(config: U) => {
    if (typeof config === 'function')
      return config() as U

    return config
  }

  const loader = createLoader<U>({
    sources: isFile
      ? [
          {
            files: resolved,
            extensions: [],
            rewrite,
          },
        ]
      : [
          {
            files: [
              'vuetify.config',
            ],
            // we don't want `package.json` to be loaded
            extensions: ['mts', 'cts', 'ts', 'mjs', 'cjs', 'js'],
            rewrite,
          },
          ...extraConfigSources,
        ],
    cwd,
    defaults: inlineConfig,
    merge: false,
  })

  const result = await loader.load()
  if (result.config?.config === false)
    result.config = Object.assign(defaults, inlineConfig)
  else
    result.config = Object.assign(defaults, result.config || inlineConfig)

  delete result.config.config

  return result
}
