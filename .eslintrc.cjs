module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  ignorePatterns: ['.eslintrc.cjs', 'supabase/functions/**/*.ts'],
  settings: {
    "import/resolver": {
      typescript: {
        project: './tsconfig.json',
        alwaysTryTypes: true
      },
      alias: {
        map: [["@", "./src"]],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
      },
    },
  },
  rules: {

    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    'prefer-arrow-callback': 'warn',
    'semi': ['error', 'never'],
    'quotes': ['error', 'single'],
    'eol-last': ['error', 'always'],
    'indent': ['error', 2],
  },
  overrides: [
    {
      files: ['packages/server/commands/**/*.ts'],
      rules: {
        'import/no-default-export': 'off',
      },
    },
  ],
}
