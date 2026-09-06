export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },

  {
    files: ["script.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        alert: "readonly",
        document: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        IntersectionObserver: "readonly",
        navigator: "readonly",
        requestAnimationFrame: "readonly",
        setTimeout: "readonly",
        window: "readonly",
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      "no-constant-condition": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-self-assign": "error",
      "no-undef": "error",
      "no-unexpected-multiline": "error",
      "no-unreachable": "error",
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "use-isnan": "error",
      "valid-typeof": "error",
    },
  },

  {
    files: ["vite.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        __dirname: "readonly",
        process: "readonly",
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      "no-constant-condition": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-self-assign": "error",
      "no-undef": "error",
      "no-unexpected-multiline": "error",
      "no-unreachable": "error",
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "use-isnan": "error",
      "valid-typeof": "error",
    },
  },
]