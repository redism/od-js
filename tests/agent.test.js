import express from 'express'
import supertest from 'supertest'
import { BaseServerResponse, TestAgent } from '../src'
import { TestDataWrapper } from '../src/agent/tester'
import { FetchNodeAgent } from '../src/agent/fetcher_node'

class MyAgent {
  constructor(agent) {
    this.agent = agent
  }

  getName() {
    return this.agent.get('/name')
  }

  getExchangeRates() {
    // https://api.exchangeratesapi.io/latest
    return this.agent.get('/latest')
  }
}

class CustomResponseTester extends TestDataWrapper {
  shouldBeOkWithValue(value) {
    expect(this.json).toHaveProperty('ok', value)
  }
}

class ExchangeRateResponse extends BaseServerResponse {
  rateOf(key) {
    return this.json.rates[key]
  }
}

describe('Agents', () => {
  let app
  beforeAll(() => {
    app = express()
    app.get('/name', (req, res) => res.json({ ok: 1 }))
    app.get('/latest', (req, res) => res.json({ ok: 1, fromExpress: true }))
  })

  describe('TestAgent', () => {
    it('TestAgent - default TestDataWrapper response', async () => {
      const agent = new MyAgent(new TestAgent(supertest.agent(app)))
      const r = await agent.getName().expect(200)
      expect(r).toBeInstanceOf(TestDataWrapper)
      expect(r.res.status).toEqual(200)
      expect(r.json).toHaveProperty('ok', 1)
    })

    it('TestAgent - with base response class', async () => {
      const agent = new MyAgent(new TestAgent(supertest.agent(app), { ClsResponseWrapper: CustomResponseTester }))
      const r = await agent.getName().expect(200)
      expect(r).toBeInstanceOf(CustomResponseTester)
      r.shouldBeOkWithValue(1)
      expect(() => {
        r.shouldBeOkWithValue(0)
      }).toThrow()
    })

    it('TestAgent without expect (assuming 200)', async () => {
      const agent = new MyAgent(new TestAgent(supertest.agent(app)))
      const r = await agent.getName()
      expect(r).toBeInstanceOf(TestDataWrapper)
      expect(r.res.status).toEqual(200)
      expect(r.json).toHaveProperty('ok', 1)
    })

    it('Calling exchange rate for comparison with FetchNodeAgent', async () => {
      const agent = new MyAgent(new TestAgent(supertest.agent(app), { ClsResponseWrapper: ExchangeRateResponse }))
      const r = await agent.getExchangeRates().expect(200)
      expect(r).toBeInstanceOf(ExchangeRateResponse)
      expect(() => r.rateOf('KRW')).toThrow() // because it is fetched from our server.
    })

    it('onResponse should work for both expect() and then()', async () => {
      const mock = jest.fn()
      const agent = new MyAgent(new TestAgent(supertest.agent(app), { onResponse: mock }))
      const r = await agent.getName()
      expect(r).toBeInstanceOf(TestDataWrapper)
      expect(r.res.status).toEqual(200)
      expect(r.json).toHaveProperty('ok', 1)
      expect(mock).toHaveBeenCalledTimes(1)
      expect(mock.mock.calls[0][0]).toBeInstanceOf(TestDataWrapper)

      await agent.getName().expect(200)
      expect(mock).toHaveBeenCalledTimes(2)
      expect(mock.mock.calls[1][0]).toBeInstanceOf(TestDataWrapper)
    })
  })

  describe('FetchNodeAgent', () => {
    it('Calling actual APIs (using https://api.exchangeratesapi.io/latest)', async () => {
      const agent = new MyAgent(
        new FetchNodeAgent('https://api.exchangeratesapi.io', { ClsResponseWrapper: ExchangeRateResponse })
      )
      const r = await agent.getExchangeRates()
      expect(r).toBeInstanceOf(ExchangeRateResponse)
      expect(r.rateOf('KRW')).toBeGreaterThan(0)
    })

    it('onResponse', async () => {
      const mock = jest.fn()
      const agent = new MyAgent(
        new FetchNodeAgent('https://api.exchangeratesapi.io', {
          ClsResponseWrapper: ExchangeRateResponse,
          onResponse: mock,
        })
      )
      const r = await agent.getExchangeRates()
      expect(r).toBeInstanceOf(ExchangeRateResponse)
      expect(r.rateOf('KRW')).toBeGreaterThan(0)
      expect(mock).toHaveBeenCalledTimes(1)
      expect(mock.mock.calls[0][0]).toBeInstanceOf(ExchangeRateResponse)
    })
  })
})
