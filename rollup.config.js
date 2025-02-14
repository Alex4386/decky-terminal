import deckyPlugin from "@decky/rollup";

export default deckyPlugin({
  plugins: [
    {
      name: 'resolve-xterm',
      resolveId(source) {
        if (source.startsWith('@xterm/')) {
          return null; // Let nodeResolve handle it
        }
      }
    }
  ]
});