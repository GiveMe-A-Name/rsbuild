import path from 'path';
import { ensureAbsolutePath, type ChainedConfig } from '@rsbuild/shared';
import type { RsbuildPlugin, ModuleScopes } from '../types';

export const isPrimitiveScope = (
  items: unknown[],
): items is Array<string | RegExp> =>
  items.every(
    (item) =>
      typeof item === 'string' ||
      Object.prototype.toString.call(item) === '[object RegExp]',
  );

export const applyScopeChain = (
  defaults: ModuleScopes,
  options: ChainedConfig<ModuleScopes>,
): ModuleScopes => {
  if (Array.isArray(options)) {
    if (isPrimitiveScope(options)) {
      return defaults.concat(options);
    }
    return options.reduce<ModuleScopes>(applyScopeChain, defaults);
  }
  return options(defaults) || defaults;
};

export const pluginModuleScopes = (): RsbuildPlugin => ({
  name: 'plugin-module-scopes',

  setup(api) {
    api.modifyWebpackChain(async (chain, { CHAIN_ID }) => {
      const config = api.getNormalizedConfig();
      const scopeOptions = config.source.moduleScopes;

      if (!scopeOptions) {
        return;
      }

      const { ModuleScopePlugin } = await import(
        '../webpackPlugins/ModuleScopePlugin'
      );

      const scopes = applyScopeChain([], scopeOptions);

      const rootPackageJson = path.resolve(
        api.context.rootPath,
        './package.json',
      );

      const formattedScopes = scopes.map((scope: string | RegExp) => {
        if (typeof scope === 'string') {
          return ensureAbsolutePath(api.context.rootPath, scope);
        }
        return scope;
      });

      chain.resolve
        .plugin(CHAIN_ID.RESOLVE_PLUGIN.MODULE_SCOPE)
        .use(ModuleScopePlugin, [
          {
            scopes: formattedScopes,
            allowedFiles: [rootPackageJson],
          },
        ]);
    });
  },
});