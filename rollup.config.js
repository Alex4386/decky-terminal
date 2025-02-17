import deckyPlugin from "@decky/rollup";
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default deckyPlugin({
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false
    })
  ]
});