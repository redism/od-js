export * from './param'
import _ from 'lodash'
import { mapObjectValues, slicedArray, maketh } from './util'

_.mixin({ mapObjectValues, slicedArray, maketh })

export { _ }
