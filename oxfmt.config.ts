import { defineConfig } from 'oxfmt'

export default defineConfig({
  printWidth: 100,
  useTabs: false,
  singleQuote: true,
  jsxSingleQuote: false,
  quoteProps: 'as-needed',
  trailingComma: 'all',
  semi: false,
  arrowParens: 'always',
  singleAttributePerLine: true,
  ignorePatterns: ['**/routeTree.gen.ts'],
})
