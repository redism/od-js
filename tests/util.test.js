import { _ } from '../src/index'

describe('mixin-lodash', () => {
  it('mapObjectValues', () => {
    expect(_.mapObjectValues({ a: 100 }, (k, v) => v + 100)).toEqual({ a: 200 })
    expect(_.mapObjectValues({ a: 100 }, (k, v) => k + 100)).toEqual({ a: 'a100' })
  })

  it('slicedArray', () => {
    expect(_.slicedArray([ 1, 2, 3, 4, 5, 6 ], 5)).toEqual([ [ 1, 2, 3, 4, 5 ], [ 6 ] ])
    expect(_.slicedArray([ 1, 2, 3 ], 3)).toEqual([ [ 1, 2, 3 ] ])
    expect(_.slicedArray([ 1, 2, 3 ], 5)).toEqual([ [ 1, 2, 3 ] ])
  })
})
