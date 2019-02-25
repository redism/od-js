/* eslint-disable no-empty-function,class-methods-use-this */

//
// 아무것도 수행하지 않지만 클래스의 형상이 다른 agent 들과 일치하는 테스트용 agent 이다.
//
export class MockAgent {
  makeHeader() {}

  async get() {}

  async post() {}

  async del() {}

  postWithForm() {}
}
