import _ from 'lodash'

export class BaseServerResponse {
  constructor(res, json) {
    this.res = res // original response data
    this.json = json // parsed json data
  }

  get data() {
    return this.json.data
  }

  async text() {
    if (_.isFunction(this.res.text)) {
      return this.res.text()
    }
    return this.res.text
  }

  /**
   * @return {?ServerError}
   */
  get error() {
    return this.json.error || null
  }

  throwIfError() {
    if (this.error) {
      throw this.error
    }
  }

  /**
   * Error message generated from server error.
   * @return {?string}
   */
  getErrorMessage() {
    const { error } = this.json
    if (error) {
      const { code, message } = error
      return `[${code}] ${message}`
    }
    return null
  }
}
