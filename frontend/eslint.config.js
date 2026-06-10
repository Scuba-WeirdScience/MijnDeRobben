// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  // ── Generated files ────────────────────────────────────────────────────────
  {
    ignores: ['src/generated/**', 'src/lib/spartan/**'],
  },

  // ── spartan/ui Helm library — exempt from app-prefix selector rules ────────
  {
    files: ['src/lib/spartan/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': 'off',
      '@angular-eslint/component-selector': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },

  // ── TypeScript sources ─────────────────────────────────────────────────────
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      // Angular selectors
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],

      // _TW_SAFELIST constants are intentionally unused by code — they exist for Tailwind scanning
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^_TW_SAFELIST$',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],

      // These stylistic rules are too noisy for this codebase
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',

      // Allow `any` in a few justified patterns (event handlers, Firebase callable wrappers)
      // but keep it as a warning so new cases are visible
      '@typescript-eslint/no-explicit-any': 'warn',

      // Empty functions are used intentionally in CVA stubs and no-op callbacks
      '@typescript-eslint/no-empty-function': 'warn',

      // Input rename is intentional for readonly alias pattern
      '@angular-eslint/no-input-rename': 'off',
    },
  },

  // ── HTML templates ─────────────────────────────────────────────────────────
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      // label-has-associated-control fires on raw <label> wrapping custom components —
      // our DSC <app-form-field> handles label association internally
      '@angular-eslint/template/label-has-associated-control': 'off',

      // click-events-have-key-events / interactive-supports-focus: backdrop divs use
      // (click) for dismiss — acceptable UX pattern, not a real a11y issue here
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/interactive-supports-focus': 'warn',

      // Prefer @if/@for over *ngIf/*ngFor (error for new code, existing uses are in navbar)
      '@angular-eslint/template/prefer-control-flow': 'warn',

      // output named 'blur' is a CVA pattern
      '@angular-eslint/no-output-native': 'off',
    },
  },
]);
