module.exports = (function() {
  const IGNORE = 0

  return {
    parser: 'babel-eslint',
    extends: ['airbnb', 'prettier'],
    env: {
      es6: true,
      node: true,
      // jest: true,
    },
    globals: {
      jasmine: true,
    },
    rules: {
      'import/prefer-default-export': IGNORE, // https://github.com/airbnb/javascript/issues/1365#issuecomment-347147411
      'no-shadow': IGNORE,
      'no-console': IGNORE,
      'no-unused-expressions': IGNORE,
    },
  }
})()
