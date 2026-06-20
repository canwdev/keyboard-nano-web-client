import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  stylistic: true,
  ignores: [
    'src/auto-import.d.ts',
  ],
})
