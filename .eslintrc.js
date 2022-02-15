module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    // default exports suck and only make things more confusing
    'import/prefer-default-export': 'off',
    // import without extension for all typescript files,
    // but with explicit extension for everything else
    'import/extensions': [
      'warn', // or error?
      'always', // "never" | "always" | "ignorePackages",
      {
        // ignorePackages: false,
        pattern: {
          ts: 'never',
        },
      },
    ],
    'import/group-exports': 'error',
  },
};
