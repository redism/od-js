import moment from 'moment'
import _ from 'lodash'

export function ensure (expr, errorObject, errorData = {}) {
  if (!expr) {
    const origErrorObject = errorObject

    if (_.isFunction(errorObject)) {
      errorObject = errorObject(errorData) || 'Undefined error'
    }

    let msg, code, status
    if (_.isString(errorObject)) {
      msg = errorObject
      code = -1
      status = 400
    } else if (_.isObject(errorObject)) {
      msg = errorObject.msg
      code = errorObject.code
      status = errorObject.status
    } else {
      msg = 'Internal error. (No error signature specified)'
      code = -1042
      status = 500
    }

    const err = new Error(msg)
    err.code = code || -1
    err.status = status || 500
    err.message = msg
    err.handled = true
    err._errorObject = origErrorObject
    throw err
  }
  return expr
}

function ensureOneOf (value, possibles, errorObject, errorData) {
  return ensure(possibles.indexOf(value) >= 0, errorObject, errorData || { value, possibles })
}

function ensureNonEmptyString (value, errorObject, errorData) {
  return ensure(_.isString(value) && !_.isEmpty(value), errorObject, errorData || { value })
}

function ensureBool (value, errorObject, errorData) {
  return ensure(_.isBoolean(value), errorObject, errorData || { value })
}

ensure.oneOf = ensureOneOf
ensure.nonEmptyString = ensureNonEmptyString
ensure.bool = ensureBool

const signature = 'od.sanitizer'
const wrap = (funcSanitize, name = '', options = {}) => {
  if (name) {
    funcSanitize._sanitizer = [ signature, name ].join('.')
  } else {
    funcSanitize._sanitizer = signature
  }
  funcSanitize._sanitizerOptions = options
  return funcSanitize
}
export const isSanitizer = fn => {
  return _.isFunction(fn) && fn._sanitizer && fn._sanitizer.startsWith(signature)
}
const isJustSanitizer = fn => {
  return isSanitizer(fn) && fn._sanitizer.endsWith('just')
}
const isLazySanitizer = fn => {
  return isSanitizer(fn) && fn._sanitizer.endsWith('lazy')
}
export const isObjectSanitizer = fn => {
  return isSanitizer(fn) && fn._sanitizer.endsWith('object')
}
export const getSanitizerOptions = fn => fn._sanitizerOptions

const objectSanitizer = function ({ defError }) {
  return (objSrc, { requireAllFields = false, error = defError, after = (v => v) } = {}) => {
    const obj = _.clone(objSrc)
    ensure(_.isObject(obj), 'Invalid usage of sanitizer.object')
    const defaultValue = {}
    const _lazyFields = []

    for (let prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        ensure(isSanitizer(obj[ prop ]), `Invalid usage of sanitizer.object, [${prop}] is not a sanitizer`)
        if (isJustSanitizer(obj[ prop ])) {
          defaultValue[ prop ] = () => obj[ prop ]()
        } else if (isLazySanitizer(obj[ prop ])) {
          const lazySanitizerOptions = obj[ prop ]._sanitizerOptions
          _lazyFields.push({ mapper: obj[ prop ], prop, options: lazySanitizerOptions })
          delete obj[ prop ]
        }
      }
    }

    const lazyFields = _.sortBy(_lazyFields, ({ options: { priority } }) => -priority)

    return wrap(value => {
      let converted = {}

      // lazy sanitizer can have a function, so evaluate each time.
      Object.entries(defaultValue).forEach(([ key, evaluator ]) => {
        converted[ key ] = evaluator()
      })

      ensure(_.isObject(value), error, { value, message: 'Given value is not an object.' })
      const processedProp = []
      for (let prop in value) {
        // console.log(`Processing ${prop} : ${obj[ prop ]}`)
        if (value.hasOwnProperty(prop) && obj.hasOwnProperty(prop)) {
          try {
            converted[ prop ] = obj[ prop ](value[ prop ], error)
          } catch (ex) {
            ensure(false, error, { value, message: `parameter=${prop}` })
          }
          processedProp.push(prop)
        }
      }

      // in case passing 'undefined' pass sanitize.
      for (let prop in obj) {
        if (obj.hasOwnProperty(prop) && processedProp.indexOf(prop) === -1 && !converted.hasOwnProperty(prop)) {
          try {
            converted[ prop ] = obj[ prop ](undefined, error)
          } catch (ex) {
            // throw error only if requireAllFields is true.
            ensure(!requireAllFields, error, { value, message: `parameter=${prop}` })
          }
        }
      }

      lazyFields.forEach(({ prop, mapper }) => { converted[ prop ] = mapper(converted) })

      if (requireAllFields) {
        ensure(Object.keys(converted).length === Object.keys(obj).length,
          error, { value, message: 'Missing fields exist.' })
      }

      return after(converted)
    }, 'object', { keys: Object.keys(obj) })
  }
}

const chainSanitizer = ({ defError }) => (...sanitizers) => {
  if (sanitizers.length === 0) {
    return v => v
  }

  const last = sanitizers[ sanitizers.length - 1 ]
  let maxIndex = sanitizers.length - 1
  let options = {}

  if (isSanitizer(last)) {
    maxIndex++
  } else { // assume it's an option.
    options = last
  }

  options = Object.assign({ error: defError }, options)

  const errorIsNotDefault = options.error !== defError

  return wrap(value => {
    let intermediateValue = value
    for (let i = 0; i < maxIndex; i++) {
      try {
        intermediateValue = sanitizers[ i ](intermediateValue)
      } catch (ex) {
        const err = errorIsNotDefault ? options.error || ex._errorObject : ex._errorObject || options.error
        ensure(false, err, { value })
      }
    }
    return intermediateValue
  })
}

const arraySanitizer = ({ defError }) => (sanitizer, { error = defError } = {}) => {
  return wrap(value => {
    ensure(_.isArray(value), error, { value })
    return value.map((v, index) => {
      try {
        return sanitizer(v)
      } catch (ex) {
        ensure(false, error, { value, message: `Item at index ${index} failed sanitize.` })
      }
    })
  })
}

const anyOfSanitizer = ({ defError }) => (...sanitizers) => {
  if (sanitizers.length === 0) {
    return v => v
  }

  const last = sanitizers[ sanitizers.length - 1 ]
  let maxIndex = sanitizers.length - 1
  let options = {}
  if (isSanitizer(last)) {
    maxIndex++
  } else { // assume it's an option.
    options = last
  }

  options = Object.assign({ error: defError }, options)

  return wrap(value => {
    for (let i = 0; i < maxIndex; i++) {
      try {
        return sanitizers[ i ](value)
      } catch (ex) {
      }
    }
    ensure(false, options.error, { value })
  })
}

const parseIntSanitizer = () => () => {
  return wrap(value => parseInt(value, 10))
}

const positiveIntSanitizer = ({ defError }) => ({ error = defError } = {}) => {
  return wrap(value => {
    ensure(_.isInteger(value), error, { value })
    ensure(value >= 0, error, { value })
    return value
  })
}

const nonEmptyStringSanitizer = ({ defError }) => ({ error = defError } = {}) => {
  return wrap(value => {
    ensure.nonEmptyString(value, error, { value })
    return value
  })
}

const mapExactSanitizer = ({ defError }) => (valueToCheck, valueToRet, { error = defError } = {}) => {
  return wrap(value => {
    ensure(value === valueToCheck, error, { value })
    return valueToRet
  })
}

const binaryNumberToBoolSanitizer = ({ defError }) => ({ error = defError } = {}) => {
  return wrap(value => {
    const i = parseInt(value, 10)
    ensure.oneOf(i, [ 0, 1 ], error, { value })
    return i === 1
  })
}

const linkStringSanitizer = ({ defError }) => ({ error = defError } = {}) => {
  return wrap(value => {
    const val = value.trim()
    ensureNonEmptyString(val, error, { value })
    ensure(val.toLowerCase().startsWith('http'), error, { value })
    return val
  })
}

const regEmail = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const emailSanitizer = ({ defError }) => ({ error = defError } = {}) => {
  return wrap(value => {
    const val = value.trim()
    ensureNonEmptyString(val, error, { value })
    ensure(regEmail.test(val), error, { value })
    return val
  })
}

const dateTimeSanitizer = ({ defError }) => (options) => {
  options = Object.assign({
    format: 'YYYY-MM-DD HH:mm:ss',
    error: defError
  }, options || {})

  return wrap(value => {
    let val
    if (_.isString(value)) {
      val = moment(value, options.format)
    } else if (_.isNumber(value)) {
      val = moment(new Date(value))
    } else if (value instanceof Date) {
      val = moment(value)
    }

    ensure(val.isValid(), options.error)
    return val.format(options.format)
  })
}

const oneOfSanitizer = ({ defError }) => (possibles, { error = defError } = {}) => {
  let values
  let mapper
  if (_.isArray(possibles)) {
    values = possibles
    mapper = index => values[ index ]
  } else if (_.isObject(possibles)) {
    values = Object.keys(possibles)
    mapper = index => possibles[ values[ index ] ]
  } else {
    ensure(false, 'oneOf requires array or object.')
  }

  return wrap(value => {
    const index = values.indexOf(value)
    ensure(index >= 0, error, { value, possibles })
    return mapper(index)
  })
}

const just = () => (value) => {
  const getter = _.isFunction(value) ? value : () => value
  return wrap(getter, 'just')
}

const exactly = ({ defError }) => (val, { error = defError } = {}) => {
  return wrap(value => {
    ensure(val === value, error, { value })
    return value
  })
}

const ensureSanitizer = ({ defError }) => (checker, { error = defError } = {}) => {
  return wrap(value => {
    try {
      ensure(checker(value), error, { value })
    } catch (ex) {
      ensure(false, error, { value })
    }
    return value
  })
}

const pass = () => (mapper = v => v) => {
  return wrap(v => mapper(v))
}

const parsePositiveInt = function ({ defError }) {
  return function ({ error = defError } = {}) {
    return this.builder().parseInt().positiveInt().build({ error })
  }
}

/**
 * Parse FileList[] which can be get from Input of type "file".
 */
const fileList = ({ defError }) => ({ required = false, error = defError, defaultValue = undefined } = {}) => {
  return wrap(value => {
    if (!value) {
      ensure(!required, error, { value })
      return defaultValue
    }
    ensure(_.isObject(value) && value[ 0 ], error, { value }) // FileList object looks like array but it doesn't..l
    return value[ 0 ]
  })
}

/**
 * Used exclusively on sanitizer.object(). Field is evaluated after other fields of higher priorities are evaluated.
 */
const lazy = ({ defError }) => (mapper, { priority = 10, error = defError } = {}) => {
  return wrap(value => mapper(value), 'lazy', { priority })
}

function createSanitizedObject (options) {
  const passer = pass(options)

  const s = {
    object: objectSanitizer(options),
    chain: chainSanitizer(options),
    array: arraySanitizer(options),
    anyOf: anyOfSanitizer(options),
    mapExact: mapExactSanitizer(options),
    binaryNumberToBool: binaryNumberToBoolSanitizer(options),
    nonEmptyString: nonEmptyStringSanitizer(options),
    linkString: linkStringSanitizer(options),
    email: emailSanitizer(options),
    parseInt: parseIntSanitizer(options),
    positiveInt: positiveIntSanitizer(options),
    dateTime: dateTimeSanitizer(options),
    oneOf: oneOfSanitizer(options),
    parsePositiveInt: parsePositiveInt(options),
    exactly: exactly(options),
    just: just(options),
    ensure: ensureSanitizer(options),
    pass: pass(options),
    fileList: fileList(options),
    lazy: lazy(options),
    toString: () => passer(v => v.toString()),
    trim: () => passer(v => v.toString().trim())
  }

  s.builder = () => {
    const builder = {}
    const list = []
    const addToBuilder = sanitizer => list.push(sanitizer)
    for (let san in s) {
      if (s.hasOwnProperty(san)) {
        ((san) => {
          Object.defineProperty(builder, san, {
            configurable: false,
            value: (...args) => {
              addToBuilder(s[ san ](...args))
              return builder
            }
          })
        })(san)
      }
    }
    builder.build = ({ error } = {}) => {
      if (error) {
        return s.chain(...list, { error })
      }
      return s.chain(...list)
    }
    return builder
  }

  return s
}

export const sanitizer = (options) => {
  options = Object.assign({
    defError: 'Invalid param'
  }, options || {})

  return createSanitizedObject(options)
}
