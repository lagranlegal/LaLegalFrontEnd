import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src/types/api.ts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // NBSP (U+00A0) es el separador real que produce Intl.NumberFormat('es-CO')
      // para dinero — aparece a propósito en tests/money.test.ts.
      'no-irregular-whitespace': ['error', { skipStrings: true, skipTemplates: true, skipComments: true, skipRegExps: true }],
    },
  },
  {
    // shadcn/ui genera estos archivos — no se edita el diseño a mano por
    // componente (CLAUDE.md regla 4); se siguen sus propias convenciones.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Punto de entrada — nunca se hot-reload-ea como componente en sí mismo.
    files: ['src/main.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // docs/DESIGN_SYSTEM.md §6: "ESLint rechaza hex/rgb en features/ y
    // components/shared/" — todo color/radio/sombra sale de tokens.css.
    files: ['src/features/**/*.{ts,tsx}', 'src/components/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/#([0-9a-fA-F]{3}){1,2}\\b/]",
          message: 'Valor hex suelto — usa un token de tokens.css (docs/DESIGN_SYSTEM.md §2), nunca un color a mano.',
        },
        {
          selector: "Literal[value=/rgba?\\(/]",
          message: 'Valor rgb()/rgba() suelto — usa un token de tokens.css (docs/DESIGN_SYSTEM.md §2), nunca un color a mano.',
        },
      ],
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.node,
    },
  },
)
