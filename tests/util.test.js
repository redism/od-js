import { _ } from '../src/index'

describe('mixin-lodash', () => {
  it('mapObjectValues', () => {
    expect(_.mapObjectValues({ a: 100 }, (k, v) => v + 100)).toEqual({ a: 200 })
    expect(_.mapObjectValues({ a: 100 }, (k, v) => k + 100)).toEqual({ a: 'a100' })
  })
})
