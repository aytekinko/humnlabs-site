import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    {
      name: 'experiment-redirect',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/experiment') {
            res.writeHead(301, { Location: '/experiment/' })
            res.end()
            return
          }
          next()
        })
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        experiment: resolve(__dirname, 'experiment/index.html'),
        privacy: resolve(__dirname, 'privacy/index.html'),
      },
    },
  },
})
