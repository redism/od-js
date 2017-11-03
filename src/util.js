export const mapObjectValues = (obj, iteratee) => {
  const newObj = {}
  Object.keys(obj).forEach(k => { newObj[ k ] = iteratee(k, obj[ k ]) })
  return newObj
}

export const slicedArray = (arr, size, mapper = v => v) => {
  const l = arr.length
  const chunks = []
  for (let i = 0; i < l; i += size) {
    chunks.push(mapper(arr.slice(i, i + size)))
  }
  return chunks
}

/**
 * Make proper ordinal text.
 *
 * @param val {string}
 * @returns {string}
 */
export function maketh (val) {
  const num = parseInt(val, 10)
  if (num <= 0 || isNaN(num)) {
    return val
  }
  switch (val % 10) {
    case 1:
      return `${val}st`
    case 2:
      return `${val}nd`
    case 3:
      return `${val}rd`
    default:
      return `${val}th`
  }
}

