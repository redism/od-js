import FormData from 'form-data'
import _ from 'lodash'
import fetch, { Headers } from 'node-fetch'
import { BaseServerResponse } from './baseResponse'

//
// 실제로 네트워크 리퀘스트를 요청하는 Agent 이다.
//
export class FetchAgent {
  /**
   * @param serverAddress {string}
   * @param [ClsResponseWrapper=BaseServerResponse]
   */
  constructor(serverAddress, ClsResponseWrapper = BaseServerResponse) {
    this.serverAddress = serverAddress
    this.ClsResponseWrapper = ClsResponseWrapper
  }

  // eslint-disable-next-line class-methods-use-this
  makeHeader(isFormData = false) {
    const h = new Headers()
    h.append('Accept', 'application/json')

    if (!isFormData) {
      h.append('Content-Type', 'application/json')
    }
    return h
  }

  /**
   * @return {Promise<*>}
   */
  async processResponse(response, noConsumeBody) {
    if (noConsumeBody) {
      return new this.ClsResponseWrapper(response, null)
    }

    try {
      const json = await response.json()
      return new this.ClsResponseWrapper(response, json)
    } catch (ex) {
      return new this.ClsResponseWrapper(response, null)
    }
  }

  async get(url, noConsumeBody) {
    const addr = `${this.serverAddress}${url}`
    const r = await fetch(addr, {
      mode: 'cors',
      headers: this.makeHeader(),
      credentials: 'include',
    })
    return this.processResponse(r, noConsumeBody)
  }

  async post(url, params = {}, noConsumeBody) {
    const isFormData = params instanceof FormData
    const body = isFormData ? params : global.JSON.stringify(params)

    const r = await fetch(`${this.serverAddress}${url}`, {
      method: 'post',
      mode: 'cors',
      headers: this.makeHeader(isFormData),
      credentials: 'include',
      body,
    })

    return this.processResponse(r, noConsumeBody)
  }

  async del(url, noConsumeBody) {
    const addr = `${this.serverAddress}${url}`
    const r = await fetch(addr, {
      method: 'delete',
      mode: 'cors',
      headers: this.makeHeader(),
      credentials: 'include',
    })
    return this.processResponse(r, noConsumeBody)
  }

  postWithForm(url, params, attachFields, noConsumeBody) {
    const formData = new FormData()
    Object.keys(params).forEach(key => {
      if (attachFields.indexOf(key) >= 0) {
        if (_.isString(params[key])) {
          this.appendFileToForm(formData, key, params[key])
        } else {
          _.forEach(params[key] || [], file => {
            this.appendFileToForm(formData, key, file)
          })
        }
      } else if (Object.prototype.hasOwnProperty.call(params, key)) {
        formData.append(key, params[key])
      }
    })

    return this.post(url, formData, noConsumeBody)
  }

  /**
   * FormData 에 파일을 추가한다. node.js 환경과 browser 환경에서 다르게 처리해야 하기 때문에
   * override 할 수 있도록 함수를 빼둔다.
   *
   * @param formData {FormData}
   * @param key {string}
   * @param file {object}
   */
  // eslint-disable-next-line class-methods-use-this
  appendFileToForm(formData, key, file) {
    formData.append(key, file)
  }
}
