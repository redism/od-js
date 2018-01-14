import { sanitizer as Sanitizer } from '../src/param'
import _ from 'lodash'

describe('sanitizer with high-order function', () => {
  const defError = ({ value }) => `Invalid param : ${value} / [${typeof value}]`
  const sanitizer = Sanitizer({ defError: defError })

  const linkTester = sanitizer.linkString({ error: ({ value }) => `Invalid link : ${value}` })
  const binaryToBoolTester = sanitizer.binaryNumberToBool({ error: ({ value }) => `Invalid value : ${value}` })
  const infToNull = sanitizer.mapExact('inf', null, { error: defError })
  const positiveIntChecker = sanitizer.positiveInt({ error: defError })

  const eitherFalseOrValidLink = sanitizer.anyOf(
    linkTester, binaryToBoolTester, { error: ({ value }) => `Invalid link setting : ${value}` }
  )

  const validLink = 'http://www.google.com'
  const invalidLink = 'htt://www.google.com'

  it('linkString', () => {
    const linkToTest = 'htt://www.google.com'
    expect(() => linkTester(linkToTest)).toThrow(`Invalid link : ${linkToTest}`)
  })

  it('binaryNumberToBool', () => {
    expect(() => binaryToBoolTester('2')).toThrow(`Invalid value : 2`)
  })

  it('mapExact', () => {
    expect(infToNull('inf')).toBeNull()
    expect(() => infToNull('0')).toThrow(defError({ value: '0' }))
  })

  it('positiveInt', () => {
    expect(positiveIntChecker(0)).toEqual(0)
    expect(positiveIntChecker(100)).toEqual(100)
    expect(() => positiveIntChecker('123')).toThrow(defError({ value: '123' }))
  })

  it('chain', () => {
    const parseAndCheckPositive = sanitizer.chain(
      sanitizer.parseInt(),
      sanitizer.positiveInt(),
      { error: defError }
    )

    expect(parseAndCheckPositive('12')).toEqual(12)
    expect(() => parseAndCheckPositive('-123')).toThrow(defError({ value: '-123' }))
  })

  it('chain with default error', () => {
    const parseAndCheckPositive = sanitizer.chain(
      sanitizer.parseInt(),
      sanitizer.positiveInt()
    )

    expect(parseAndCheckPositive('12')).toEqual(12)
    expect(() => parseAndCheckPositive('-123')).toThrow(defError({ value: '-123' }))
  })

  it('chain with custom error', () => {
    const parseAndCheckPositive = sanitizer.chain(
      sanitizer.parseInt(),
      sanitizer.positiveInt({ error: ({ value }) => 'Nah..' })
    )

    expect(() => parseAndCheckPositive('-123')).toThrow('Nah..')
  })

  it('anyOf', () => {
    expect(eitherFalseOrValidLink(validLink)).toEqual(validLink)
    expect(eitherFalseOrValidLink('0')).toEqual(false)
    expect(eitherFalseOrValidLink('1')).toEqual(true)
    expect(() => eitherFalseOrValidLink(invalidLink)).toThrow(`Invalid link setting : ${invalidLink}`)
    expect(() => eitherFalseOrValidLink('2')).toThrow(`Invalid link setting : 2`)
  })

  it('object', () => {
    const objectSanitizer = sanitizer.object({
      name: sanitizer.nonEmptyString({ error: ({ value }) => `Invalid name field : ${value}` }),
      age: sanitizer.chain(sanitizer.parseInt(), sanitizer.positiveInt()),
    })

    const v1 = { name: '123', age: 18 }
    expect(objectSanitizer(v1)).toEqual(v1)

    const iv1 = { name: 123, age: 32 }
    expect(() => objectSanitizer(iv1)).toThrow(defError({ value: iv1 }))

    const iv2 = { name: 'jeff', age: -12 }
    expect(() => objectSanitizer(iv2)).toThrow(defError({ value: iv2 }))
  })

  it('object /w value', () => {
    const objectSanitizer = sanitizer.object({
      name: sanitizer.nonEmptyString(({ value }) => `Invalid name field : ${value}`),
      age: sanitizer.chain(sanitizer.parseInt(), sanitizer.positiveInt()),
      sex: sanitizer.just('male'),
    })

    const v1 = { name: '123', age: 18 }
    expect(objectSanitizer(v1)).toEqual(Object.assign(v1, { sex: 'male' }))
  })

  it('builder return', () => {
    const builder = sanitizer.builder()
    expect(_.isFunction(builder.nonEmptyString)).toBeTruthy()
    const s = builder.nonEmptyString().build()
    expect(s('123')).toEqual('123')
    expect(() => s('')).toThrow('Invalid param :  / [string]')
  })

  it('using builder', () => {
    // 2017-10-23 : 원래는 개별 필드에서 발생한 오류를 그대로 전파하려고 했으나, 실제로 원본값을 확인하는 것이 더 편리한 경우가 많아 수정되었다.
    const objectSanitizer = sanitizer.object({
      name: sanitizer.builder().nonEmptyString({ error: ({ value }) => `Invalid name field : ${value}` }).build(),
      age: sanitizer.builder().parseInt().positiveInt().build(),
    })

    const v1 = { name: '123', age: 18 }
    expect(objectSanitizer(v1)).toEqual(v1)

    const iv1 = { name: 123, age: 32 }
    expect(() => objectSanitizer(iv1)).toThrow(defError({ value: iv1 }))

    const iv2 = { name: 'jeff', age: -12 }
    expect(() => objectSanitizer(iv2)).toThrow(defError({ value: iv2 }))
  })

  it('builder final error', () => {
    const s = sanitizer.builder().parseInt().positiveInt().build({ error: ({ value }) => `No ${value}` })
    expect(() => s(-1)).toThrow('No -1')
  })

  it('dateTime', () => {
    const s = sanitizer.builder().dateTime().build()
    const t = '2018-01-13 01:23:45'
    expect(s(t)).toEqual(t)
    expect(() => s('')).toThrow()
  })

  it('oneOf', () => {
    const s = sanitizer.builder().oneOf([ 0, 1 ]).build()
    expect(s(0)).toEqual(0)
    expect(() => s('1')).toThrow()
    expect(() => s('2')).toThrow()
  })

  it('oneOf map', () => {
    const s = sanitizer.builder().oneOf({ 'sc': 0, 'bc': 1 }).build()
    expect(s('sc')).toEqual(0)
    expect(s('bc')).toEqual(1)
    expect(() => s('1')).toThrow()
    expect(() => s(0)).toThrow()
  })

  it('parsePositiveInt', () => {
    const s = sanitizer.parsePositiveInt({ error: ({ value }) => `No.. ${value}` })
    expect(() => s(-1)).toThrow('No.. -1')
  })

  it('exactly', () => {
    const s = sanitizer.exactly(10)
    expect(s(10)).toEqual(10)
    expect(() => s(12)).toThrow()
  })

  it('just /w function', () => {
    let i = 0
    const counter = () => i++
    const s = sanitizer.just(counter)

    expect(s()).toEqual(0)
    expect(s()).toEqual(1)
  })

  it('pass', () => {
    const s = sanitizer.pass()
    expect(s(10)).toEqual(10)
    expect(s(null)).toBeNull()
  })

  it('pass /w mapper', () => {
    const s = sanitizer.pass(v => v.toString())
    expect(s(10)).toEqual('10')
  })

  it('object sanitizer with unspecified field', () => {
    const s = sanitizer.object({ name: sanitizer.nonEmptyString() })
    expect(s({ name: 'hello', age: 20 })).toEqual({ name: 'hello' })
  })

  it('dateTime /w Date object', () => {
    const s = sanitizer.dateTime()
    expect(() => s(new Date())).not.toThrow()
  })

  it('toString', () => {
    const s = sanitizer.toString()
    expect(s(1)).toEqual('1')
  })

  it('trim', () => {
    const s = sanitizer.trim()
    expect(s(' 4 ')).toEqual('4')
  })

  it('toString and trim', () => {
    const s = sanitizer.chain(sanitizer.toString(), sanitizer.trim())
    expect(s(' 5931a ')).toEqual('5931a')
  })

  it('ensure', () => {
    const s = sanitizer.ensure(v => _.isString(v))
    expect(s('123')).toEqual('123')
    expect(() => s(123)).toThrow()
  })

  it('object /w lazy option', () => {
    const s = sanitizer.object({
      v1: sanitizer.parseInt(),
      v2: sanitizer.parseInt(),
      sum: sanitizer.lazy(obj => obj.v1 + obj.v2, { priority: 10 }),
      sum2: sanitizer.lazy(obj => obj.v1 + obj.v2 + obj.sum, { priority: 5 }),
    })

    expect(s({ v1: 10, v2: '20' })).toEqual({ v1: 10, v2: 20, sum: 30, sum2: 60 })
  })

  it('object /w after', () => {
    const s = sanitizer.object({
      v1: sanitizer.parseInt(),
      v2: sanitizer.parseInt(),
      sum: sanitizer.lazy(obj => obj.v1 + obj.v2, { priority: 10 }),
      sum2: sanitizer.lazy(obj => obj.v1 + obj.v2 + obj.sum, { priority: 5 }),
    }, {
      after: v => v.sum2,
    })

    expect(s({ v1: 10, v2: '20' })).toEqual(60)
  })

  it('object /w requireAllFields=true', () => {
    const s = sanitizer.object({
      name: sanitizer.nonEmptyString(),
    }, { requireAllFields: true })

    expect(() => s({ age: 10 })).toThrow()
  })

  it('object sanitizer with just function', () => {
    let i = 0
    const s = sanitizer.object({
      counter: sanitizer.just(() => i++),
    })

    expect(s({})).toEqual({ counter: 0 })
    expect(s({})).toEqual({ counter: 1 })
    expect(s({})).toEqual({ counter: 2 })
  })

  it('object /w anyOf(just) should insert succeeded value.', () => {
    const s = sanitizer
    const listSanitizer = s.object({
      page: s.anyOf(
        s.parsePositiveInt(),
        s.just(1)
      ),
      pageSize: s.anyOf(
        s.parsePositiveInt(),
        s.just(10)
      ),
    }, {
      requireAllFields: true,
    })

    expect(listSanitizer({ page: 5 })).toEqual({ page: 5, pageSize: 10 })
  })

  it('array', () => {
    const s = sanitizer
    const array = s.array(s.parsePositiveInt())

    expect(array([ 1, 2, 3 ])).toEqual([ 1, 2, 3 ])
    expect(array([ '1', 2, 3 ])).toEqual([ 1, 2, 3 ])
  })

  it('email', () => {
    const s = sanitizer.email()
    expect(s('redism@gmail.com')).toEqual('redism@gmail.com')
    expect(() => s('jay')).toThrow()
  })

  it('object error propagation', () => {
    const s = sanitizer.object({
      id: sanitizer.email({ error: 'id error.' }),
    }, { version: 2 })

    expect(() => s({ id: null })).toThrow('id error.')
  })

  it('existsInObjectValues', () => {
    const STATUS = {
      Pending: 0,
      Confirmed: 1,
      Rejected: 2,
    }

    const s = sanitizer.object({
      status: sanitizer.existsInObjectValues(STATUS, { error: 'status error' }),
    }, {
      version: 2,
    })

    expect(s({ status: 0 })).toEqual({ status: 0 })
    expect(s({ status: 1 })).toEqual({ status: 1 })
    expect(s({ status: 2 })).toEqual({ status: 2 })
    expect(() => s({ status: '0' })).toThrow('status error')
    expect(() => s({ status: 3 })).toThrow('status error')
  })
})
