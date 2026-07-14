/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['./node.js'],
  plugins: ['simple-import-sort'],
  rules: {
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
  },
}
