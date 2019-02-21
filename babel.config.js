module.exports = function babelConfig(api) {
  api.cache(true)

  const include = ['src', 'tests']

  const presets = [
    [
      '@babel/env',
      {
        targets: { node: true },
      },
    ],
  ]

  // 주석처리되어 있는 것은 관심이 가지만 웹스톰에서 아직 지원하지 않거나 현재 프로젝트 환경에서 의미가 크게 없는 기능들이다.
  const plugins = [
    'babel-plugin-transform-promise-to-bluebird',
    ['@babel/plugin-proposal-decorators', { legacy: true }], // https://babeljs.io/docs/en/babel-plugin-proposal-decorators
    ['@babel/plugin-proposal-class-properties', { loose: true }], // https://babeljs.io/docs/en/babel-plugin-proposal-class-properties
    '@babel/plugin-proposal-do-expressions', // https://babeljs.io/docs/en/babel-plugin-proposal-do-expressions
    // '@babel/plugin-proposal-function-bind', // https://babeljs.io/docs/en/babel-plugin-proposal-function-bind
    // '@babel/plugin-proposal-function-sent', // https://babeljs.io/docs/en/babel-plugin-proposal-function-sent
    // '@babel/plugin-proposal-logical-assignment-operators', // https://babeljs.io/docs/en/babel-plugin-proposal-logical-assignment-operators
    '@babel/plugin-proposal-nullish-coalescing-operator', // https://babeljs.io/docs/en/babel-plugin-proposal-nullish-coalescing-operator
    '@babel/plugin-proposal-numeric-separator', // https://babeljs.io/docs/en/babel-plugin-proposal-numeric-separator
    '@babel/plugin-proposal-optional-chaining', // https://babeljs.io/docs/en/babel-plugin-proposal-optional-chaining
    // ['@babel/plugin-proposal-pipeline-operator', { proposal: 'minimal' }], // https://babeljs.io/docs/en/babel-plugin-proposal-pipeline-operator
    '@babel/plugin-proposal-throw-expressions', // https://babeljs.io/docs/en/babel-plugin-proposal-throw-expressions
    // '@babel/plugin-syntax-dynamic-import', // https://babeljs.io/docs/en/babel-plugin-syntax-dynamic-import
    // '@babel/plugin-syntax-import-meta', // https://github.com/tc39/proposal-import-meta
    '@babel/plugin-proposal-json-strings', // https://github.com/babel/website/blob/master/docs/plugin-proposal-json-strings.md
  ]

  return { presets, plugins, include }
}
