import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';
import commonjs from 'rollup-plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import pkg from './package.json';

const sharedConfig = {
  input: 'src/index.ts',
  plugins: [
    replace({
      'process.env.NODE_ENV': process.env.NODE_ENV,
    }),
    resolve({
      browser: true,
    }),
    commonjs(),
    typescript({
      typescript: require('typescript'),
      tsconfigOverride: {
        compilerOptions: {
          module: 'ESNext',
        },
      },
    }),
  ],
  onwarn: (warning, warn) => {
    // suppress eval warnings
    if (warning.code === 'EVAL') return;
    warn(warning);
  },
};

export default [
  {
    ...sharedConfig,
    output: [
      {
        file: pkg.main,
        format: 'cjs',
      },
      {
        file: pkg.unpkg,
        format: 'iife',
        name: 'syncitTransporter',
        plugins: sharedConfig.plugins.concat(terser()),
      },
      {
        file: pkg.module,
        format: 'esm',
      },
    ],
  },
  ...['base', 'local-storage', 'peerjs', 'agora-rtm'].map(name => ({
    ...sharedConfig,
    input: `src/${name}.ts`,
    output: [
      {
        file: `es/${name}.js`,
        format: 'esm',
      },
    ],
  })),
];
