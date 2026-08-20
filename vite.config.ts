import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Inyecta el CSP dependiente del ambiente como `<meta http-equiv>` en el
 * index.html construido.
 *
 * POR QUÉ NO VA EN `vercel.json`: ese archivo es estático y Vercel lo lee
 * ANTES de correr el build, así que no puede interpolar variables de entorno.
 * Con el CSP completo ahí, `connect-src` quedaba con el backend de dev
 * hardcodeado y el mismo repo no podía desplegarse a dos ambientes: la app de
 * producción heredaría un CSP que solo permite hablar con dev.
 *
 * REPARTO ENTRE META Y HEADER: `frame-ancestors`, `base-uri` y `form-action`
 * se IGNORAN en un `<meta>` (solo valen como header), así que esos se quedan
 * en `vercel.json`. Acá van las directivas que sí funcionan en meta y que
 * dependen del ambiente. Los dos CSP se aplican en conjunto —el navegador
 * exige cumplir ambos— por eso el de `vercel.json` NO declara `default-src`:
 * si lo hiciera, `connect-src` heredaría de él y bloquearía el backend.
 */
function cspPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      const api = env.VITE_API_URL?.trim()
      const supabase = env.VITE_SUPABASE_URL?.trim()
      if (!api || !supabase) {
        // Falla el build en vez de publicar una app que no puede hablar con su
        // backend: sin estas variables el CSP quedaría en 'self' y todas las
        // requests morirían en el navegador, con un error difícil de rastrear.
        throw new Error(
          'Faltan VITE_API_URL y/o VITE_SUPABASE_URL: son necesarias para armar el CSP. ' +
            'Configúralas en las variables de entorno del proyecto (ver docs/DEPLOY.md).',
        )
      }
      const csp = [
        "default-src 'self'",
        "script-src 'self'",
        // 'unsafe-inline' en estilos: Tailwind y Radix inyectan estilos en
        // línea (posicionamiento de popovers/diálogos). No aplica a scripts.
        "style-src 'self' 'unsafe-inline'",
        `img-src 'self' data: ${supabase}`,
        "font-src 'self' data:",
        `connect-src 'self' ${api} ${supabase}`,
      ].join('; ')
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: csp },
            injectTo: 'head-prepend',
          },
        ],
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), cspPlugin(loadEnv(mode, process.cwd(), 'VITE_'))],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
  },
}))
