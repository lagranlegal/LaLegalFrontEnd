import '@testing-library/jest-dom/vitest'

// jsdom no implementa matchMedia — lo necesitan el theme store (tema
// oscuro/claro/sistema) y `usePrefersReducedMotion`. Sin este mock,
// window.matchMedia(...) no es función y esos módulos explotan al cargar.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}
