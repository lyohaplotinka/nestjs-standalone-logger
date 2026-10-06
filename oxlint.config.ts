import { defineConfig } from 'oxlint'

export default defineConfig({
  categories: {
    correctness: 'warn',
    suspicious: 'warn',
  },
  plugins: ['oxc', 'typescript', 'unicorn'],
  ignorePatterns: ['dist/**'],
})
