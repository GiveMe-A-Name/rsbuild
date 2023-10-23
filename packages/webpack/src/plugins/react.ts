import type { RsbuildConfig, RsbuildPlugin } from '../types';
import { isProd, isUsingHMR } from '@rsbuild/shared';

export const pluginReact = (): RsbuildPlugin => ({
  name: 'plugin-react',

  setup(api) {
    api.modifyRsbuildConfig(async (config, { mergeRsbuildConfig }) => {
      const { isBeyondReact17 } = await import('@modern-js/utils');

      const babelConfig: RsbuildConfig = {
        tools: {
          babel(_, { addPresets, addPlugins }) {
            const isNewJsx = isBeyondReact17(api.context.rootPath);
            const presetReactOptions = {
              development: !isProd(),
              // Will use the native built-in instead of trying to polyfill
              useBuiltIns: true,
              useSpread: false,
              runtime: isNewJsx ? 'automatic' : 'classic',
            };

            addPresets([
              [require.resolve('@babel/preset-react'), presetReactOptions],
            ]);

            if (isProd()) {
              addPlugins([
                [
                  require.resolve(
                    '../../compiled/babel-plugin-transform-react-remove-prop-types',
                  ),
                  { removeImport: true },
                ],
              ]);
            }
          },
        },
      };

      return mergeRsbuildConfig(babelConfig, config);
    });

    api.modifyWebpackChain(async (chain, utils) => {
      const config = api.getNormalizedConfig();

      if (!isUsingHMR(config, utils)) {
        return;
      }

      const { CHAIN_ID } = utils;
      const { default: ReactFastRefreshPlugin } = await import(
        '@pmmmwh/react-refresh-webpack-plugin'
      );
      const useTsLoader = Boolean(config.tools.tsLoader);
      const rule = useTsLoader
        ? chain.module.rule(CHAIN_ID.RULE.TS)
        : chain.module.rule(CHAIN_ID.RULE.JS);

      rule.use(CHAIN_ID.USE.BABEL).tap((options) => ({
        ...options,
        plugins: [
          ...(options.plugins || []),
          [require.resolve('react-refresh/babel'), { skipEnvCheck: true }],
        ],
      }));

      chain
        .plugin(CHAIN_ID.PLUGIN.REACT_FAST_REFRESH)
        .use(ReactFastRefreshPlugin, [
          {
            overlay: false,
            exclude: [/node_modules/],
          },
        ]);
    });
  },
});