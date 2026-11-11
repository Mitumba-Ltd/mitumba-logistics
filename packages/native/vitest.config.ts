import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// react-native is a peer dependency the host provides; tests render its primitives as DOM stand-ins.
export default defineConfig({
  resolve: {
    alias: { 'react-native': fileURLToPath(new URL('./test/react-native-stub.tsx', import.meta.url)) },
  },
})
