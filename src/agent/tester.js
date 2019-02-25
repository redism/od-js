import _ from 'lodash'
import { BaseServerResponse } from './baseResponse'

export class TestDataWrapper extends BaseServerResponse {
  get body() {
    return this.res.body
  }

  get data() {
    return this.res.json.data
  }

  get error() {
    return this.res.json.error
  }

  async text() {
    return this.res.text
  }

  inspect() {
    return this.res.body
  }
}

//
// 각종 API 결과를 테스트하는데 좀 더 편리하게 하기 위한 response wrapper
//
class SuperAgentWrapper {
  constructor(tester, agent, method, args) {
    this.tester = tester
    this.agent = agent
    this.method = method
    this.args = args

    this.response = null
    this.request = this.agent[this.method](...this.args)
  }

  send(...args) {
    this.request.send(...args)
    return this
  }

  attach(...args) {
    this.request.attach(...args)
    return this
  }

  field(...args) {
    this.request.field(...args)
    return this
  }

  set(...args) {
    this.request.set(...args)
    return this
  }

  async expect(code, noReturn = false) {
    const setter = (...args) => this.request.set(...args)
    this.tester.setHeader(setter)

    const r = await this.request
    this.response = r
    const { status } = r

    if (status !== code) {
      console.error(`Response status code mismatch. Showing body.`)
      console.error(r.body)
      // eslint-disable-next-line no-undef
      expect(status).toEqual(code)
    }

    if (r.headers['set-cookie']) {
      // eslint-disable-next-line prefer-destructuring
      this.tester.token = r.headers['set-cookie'][0].split(';')[0].split('=')[1]
    }

    if (r.body.data && r.body.data.user) {
      // assume it's login response.
      this.tester.uid = r.body.data.user.uid
      this.tester.profile = r.body.data.user
    }

    const Cls = this.tester.ClsResponseWrapper || TestDataWrapper
    return noReturn ? null : new Cls(r, r.body)
  }

  then(resolve, reject) {
    // console.log(83, this.tester)
    const setter = (...args) => this.request.set(...args)
    this.tester.setHeader(setter)

    this.request.end((err, response) => {
      if (err) {
        reject(err)
        return
      }
      this.response = response
      const Cls = this.tester.ClsResponseWrapper || TestDataWrapper

      try {
        if (Cls) {
          resolve(new Cls(this.response, this.response.body))
        } else {
          resolve(this.response)
        }
      } catch (ex) {
        reject(ex)
      }
    })
  }
}

//
// express 를 테스트 케이스에서 테스트하기 위해 사용하는 agent 이다. supertest agent 를 ctor 에 전달함으로써
// 다른 agent 처럼 사용할 수 있다. 단, expect 함수를 이용하여야 한다.
//
export class TestAgent {
  constructor(supertestAgent, options = {}) {
    this.agent = supertestAgent
    this.mapFilePath = options.mapFilePath || (v => v)
    this.ClsResponseWrapper = options.ClsResponseWrapper // only used when .expect() is not called and awaited.
  }

  // eslint-disable-next-line class-methods-use-this,no-unused-vars
  setHeader(setter) {} // override point.

  get(...args) {
    return new SuperAgentWrapper(this, this.agent, 'get', args)
  }

  post(url, params = {}) {
    const wrapper = new SuperAgentWrapper(this, this.agent, 'post', [url])
    return wrapper.send(params)
  }

  postWithForm(url, obj, attachFields) {
    const wrapper = new SuperAgentWrapper(this, this.agent, 'post', [url])
    const nonFileData = { ...obj }
    const attachments = attachFields.map(fieldName => {
      const filePath = obj[fieldName]
      delete nonFileData[fieldName]
      return [fieldName, filePath]
    })

    Object.keys(nonFileData).forEach(key => {
      if (obj[key] !== undefined) {
        wrapper.field(key, obj[key].toString())
      }
    })

    attachments.forEach(([fieldName, filePath]) => {
      if (filePath) {
        if (_.isArray(filePath)) {
          filePath.forEach(fp => {
            wrapper.attach(fieldName, this.mapFilePath(fp))
          })
        } else {
          wrapper.attach(fieldName, this.mapFilePath(filePath))
        }
      }
    })

    return wrapper
  }

  del(url) {
    return new SuperAgentWrapper(this, this.agent, 'del', [url])
  }
}
