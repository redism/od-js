export const mapObjectValues = (obj, iteratee) => {
  const newObj = {}
  Object.keys(obj).forEach(k => { newObj[ k ] = iteratee(k, obj[ k ]) })
  return newObj
}
