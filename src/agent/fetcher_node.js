import assert from 'assert'
import fs from 'fs'
import _ from 'lodash'
import path from 'path'
import { FetchAgent } from './fetcher'

//
// Node.js 기반으로 동작하는 FetchAgent 이다.
//
export class FetchNodeAgent extends FetchAgent {
  // noinspection JSCheckFunctionSignatures
  /**
   * FormData 에 파일을 추가한다. browser 환경과 다르게 local file 을 업로드한다.
   *
   * @param formData {FormData}
   * @param key {string}
   * @param file {string}
   */
  // eslint-disable-next-line class-methods-use-this
  appendFileToForm(formData, key, file) {
    assert(_.isString(file), 'file must be a string.')
    formData.append(key, fs.createReadStream(file), path.basename(file))
  }
}
