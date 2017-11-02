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
