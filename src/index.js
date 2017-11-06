import _ from 'lodash'
import { mapObjectValues, slicedArray, maketh } from './util'

_.mixin({ mapObjectValues, slicedArray, maketh })

export * from './param'
export { _ }
