import { sanitizer as Sanitizer } from '../src/param'
import _ from 'lodash'

describe('sanitizer with high-order function', () => {
  const defError = ({ value }) => `Invalid param : ${value} / [${typeof value}]`
  const sanitizer = Sanitizer({ defError: defError })

  const linkTester = sanitizer.linkString(({ value }) => `Invalid link : ${value}`)
  const binaryToBoolTester = sanitizer.binaryNumberToBool(({ value }) => `Invalid value : ${value}`)
  const infToNull = sanitizer.mapExact('inf', null, defError)
  const positiveIntChecker = sanitizer.positiveInt(defError)

  const eitherFalseOrValidLink = sanitizer.anyOf(
    linkTester, binaryToBoolTester, ({ value }) => `Invalid link setting : ${value}`
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
      defError
    )

    expect(parseAndCheckPositive('12')).toEqual(12)
    expect(() => parseAndCheckPositive('-123')).toThrow(defError({ value: '-123' }))
  })

  it('chain with default error', () => {
    const parseAndCheckPositive = sanitizer.chain(
      sanitizer.parseInt(),
      sanitizer.positiveInt(),
    )

    expect(parseAndCheckPositive('12')).toEqual(12)
    expect(() => parseAndCheckPositive('-123')).toThrow(defError({ value: '-123' }))
  })

  it('chain with custom error', () => {
    const parseAndCheckPositive = sanitizer.chain(
      sanitizer.parseInt(),
      sanitizer.positiveInt(({ value }) => 'Nah..'),
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
      name: sanitizer.nonEmptyString(({ value }) => `Invalid name field : ${value}`),
      age: sanitizer.chain(sanitizer.parseInt(), sanitizer.positiveInt()),
    })

    const v1 = { name: '123', age: 18 }
    expect(objectSanitizer(v1)).toEqual(v1)

    const iv1 = { name: 123, age: 32 }
    expect(() => objectSanitizer(iv1)).toThrow('Invalid name field : 123')

    const iv2 = { name: 'jeff', age: -12 }
    expect(() => objectSanitizer(iv2)).toThrow(defError({ value: -12 }))
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
    const objectSanitizer = sanitizer.object({
      name: sanitizer.builder().nonEmptyString(({ value }) => `Invalid name field : ${value}`).build(),
      age: sanitizer.builder().parseInt().positiveInt().build(),
    })

    const v1 = { name: '123', age: 18 }
    expect(objectSanitizer(v1)).toEqual(v1)

    const iv1 = { name: 123, age: 32 }
    expect(() => objectSanitizer(iv1)).toThrow('Invalid name field : 123')

    const iv2 = { name: 'jeff', age: -12 }
    expect(() => objectSanitizer(iv2)).toThrow(defError({ value: -12 }))
  })

  it('builder final error', () => {
    const s = sanitizer.builder().parseInt().positiveInt().build(({ value }) => `No ${value}`)
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
    const s = sanitizer.parsePositiveInt(({ value }) => `No.. ${value}`)
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
})
