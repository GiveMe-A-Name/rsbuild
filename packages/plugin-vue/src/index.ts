import { deepmerge } from '@rsbuild/shared/deepmerge';
import { VueLoaderPlugin } from 'vue-loader';
import type { RsbuildPlugin, RsbuildPluginAPI } from '@rsbuild/core';
import type { VueLoaderOptions } from 'vue-loader';

export type PluginVueOptions = {
  vueLoaderOptions?: VueLoaderOptions;
};

export function pluginVue(
  options: PluginVueOptions = {},
): RsbuildPlugin<RsbuildPluginAPI> {
  return {
    name: 'plugin-vue',

    async setup(api) {
      api.modifyRsbuildConfig((config, { mergeRsbuildConfig }) => {
        return mergeRsbuildConfig(config, {
          source: {
            define: {
              // https://link.vuejs.org/feature-flags
              __VUE_OPTIONS_API__: true,
              __VUE_PROD_DEVTOOLS__: false,
            },
          },
        });
      });

      api.modifyBundlerChain(async (chain, { CHAIN_ID }) => {
        chain.resolve.extensions.add('.vue');

        const vueLoaderOptions = deepmerge(
          {
            compilerOptions: {
              preserveWhitespace: false,
            },
            experimentalInlineMatchResource:
              api.context.bundlerType === 'rspack',
          },
          options.vueLoaderOptions ?? {},
        );

        chain.module
          .rule(CHAIN_ID.RULE.VUE)
          .test(/\.vue$/)
          .use(CHAIN_ID.USE.VUE)
          .loader(require.resolve('vue-loader'))
          .options(vueLoaderOptions);

        chain.plugin(CHAIN_ID.PLUGIN.VUE_LOADER_PLUGIN).use(VueLoaderPlugin);
      });
    },
  };
}