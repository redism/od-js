export * from './param'
import _ from 'lodash'
import { mapObjectValues, slicedArray } from './util'

_.mixin({ mapObjectValues, slicedArray })

export { _ }
