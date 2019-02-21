module.exports = (function() {
  const IGNORE = 0

  return {
    env: {
      es6: true,
      node: true,
      jest: true,
    },
    rules: {
      'prefer-destructuring': IGNORE,
      'no-unused-vars': IGNORE,
      'no-shadow': IGNORE,
      'no-await-in-loop': IGNORE,
      'no-param-reassign': IGNORE,
      'no-use-before-define': IGNORE,
      'no-underscore-dangle': IGNORE,
      'no-plusplus': IGNORE,
      'no-unused-expressions': IGNORE,
      camelcase: IGNORE,
      'no-console': IGNORE,
      'no-constant-condition': IGNORE,
    },
  }
})()
