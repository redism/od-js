const ld = require('lodash')
import moment from 'moment'

export function ensure (expr, errorObject, errorData = {}) {
  if (!expr) {
    const origErrorObject = errorObject

    if (ld.isFunction(errorObject)) {
      errorObject = errorObject(errorData) || 'Undefined error'
    }

    let msg, code, status
    if (ld.isString(errorObject)) {
      msg = errorObject
      code = -1
      status = 400
    } else if (ld.isObject(errorObject)) {
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
}

function ensureOneOf (value, possibles, errorObject, errorData) {
  ensure(possibles.indexOf(value) >= 0, errorObject, errorData || { value, possibles })
}

function ensureNonEmptyString (value, errorObject, errorData) {
  ensure(ld.isString(value) && !ld.isEmpty(value), errorObject, errorData || { value })
}

function ensureBool (value, errorObject, errorData) {
  ensure(ld.isBoolean(value), errorObject, errorData || { value })
}

ensure.oneOf = ensureOneOf
ensure.nonEmptyString = ensureNonEmptyString
ensure.bool = ensureBool

const signature = 'od.sanitizer'
const wrap = (funcSanitize, name = '') => {
  if (name) {
    funcSanitize._sanitizer = [ signature, name ].join('.')
  } else {
    funcSanitize._sanitizer = signature
  }
  return funcSanitize
}
const isSanitizer = fn => {
  return ld.isFunction(fn) && fn._sanitizer && fn._sanitizer.startsWith(signature)
}
const isJustSanitizer = fn => {
  return isSanitizer(fn) && fn._sanitizer.endsWith('just')
}

const objectSanitizer = function ({ defError }) {
  return (obj, { error = defError } = {}) => {
    ensure(ld.isObject(obj), 'Invalid usage of sanitizer.object')
    const defaultValue = {}

    for (let prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        ensure(isSanitizer(obj[ prop ]), `Invalid usage of sanitizer.object, [${prop}] is not a sanitizer`)
        if (isJustSanitizer(obj[ prop ])) {
          defaultValue[ prop ] = obj[ prop ]()
        }
      }
    }

    return wrap(value => {
      let converted = ld.cloneDeep(defaultValue)
      ensure(ld.isObject(value), error, { value })
      for (let prop in value) {
        // console.log(`Processing ${prop} : ${obj[ prop ]}`)
        if (value.hasOwnProperty(prop) && obj.hasOwnProperty(prop)) {
          converted[ prop ] = obj[ prop ](value[ prop ], error)
        }
      }
      return converted
    })
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
    ensure(ld.isInteger(value), error, { value })
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

const dateTimeSanitizer = ({ defError }) => (options) => {
  options = Object.assign({
    format: 'YYYY-MM-DD HH:mm:ss',
    error: defError,
  }, options || {})

  return wrap(value => {
    let val
    if (ld.isString(value)) {
      val = moment(value, options.format)
    } else if (ld.isNumber(value)) {
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
  if (ld.isArray(possibles)) {
    values = possibles
    mapper = index => values[ index ]
  } else if (ld.isObject(possibles)) {
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
  const getter = ld.isFunction(value) ? value : () => value
  return wrap(getter, 'just')
}

const exactly = ({ defError }) => (val, { error = defError } = {}) => {
  return wrap(value => {
    ensure(val === value, error, { value })
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
const file = ({ defError }) => ({ required = false, error = defError, defaultValue = undefined } = {}) => {
  return wrap(value => {
    if (!value) {
      ensure(!required, error, { value })
      return defaultValue
    }
    ensure(value[ 0 ], error, { value }) // FileList object looks like array but it doesn't..l
    return value[ 0 ]
  })
}

function createSanitizedObject (options) {
  const passer = pass(options)

  const s = {
    object: objectSanitizer(options),
    chain: chainSanitizer(options),
    anyOf: anyOfSanitizer(options),
    mapExact: mapExactSanitizer(options),
    binaryNumberToBool: binaryNumberToBoolSanitizer(options),
    nonEmptyString: nonEmptyStringSanitizer(options),
    linkString: linkStringSanitizer(options),
    parseInt: parseIntSanitizer(options),
    positiveInt: positiveIntSanitizer(options),
    dateTime: dateTimeSanitizer(options),
    oneOf: oneOfSanitizer(options),
    parsePositiveInt: parsePositiveInt(options),
    exactly: exactly(options),
    just: just(options),
    pass: pass(options),
    file: file(options),
    toString: () => passer(v => v.toString()),
    trim: () => passer(v => v.toString().trim()),
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
