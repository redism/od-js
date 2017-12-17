import _ from 'lodash'
import moment from 'moment'
import { maketh, mapObjectValues, slicedArray } from './util'

_.mixin({ mapObjectValues, slicedArray, maketh })

export * from './param'
export { _ }
export { moment }
