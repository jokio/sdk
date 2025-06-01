import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser'
import { StorageService } from './storage.service'

type Options = {
  authUrl: string
  storage: StorageService
}

const USER_STORAGE_KEY = 'LAST_AUTH_DATA'

export class AuthService {
  get url() {
    return this.options.authUrl
  }

  constructor(private options: Options) {}

  async requestEmailLogin(
    email: string,
    returnUrl: string = location.href,
  ) {
    const res = await fetch(
      this.options.authUrl +
        `/email-verification-request/${email}?returnUrl=${returnUrl}`,
      { credentials: 'include' },
    ).then(processResponse)

    return res as boolean
  }

  async completeEmailLogin(email: string, otpCode: string) {
    const res = await fetch(
      this.options.authUrl +
        `/email-verification-complete/${email}/${otpCode}`,
      { credentials: 'include' },
    ).then(processResponse)

    await this.options.storage.setItem(USER_STORAGE_KEY, res)

    return res as IdentityUser
  }

  async requestPasskeyLogin(
    opts: {
      displayName?: string
      isRegistration?: boolean
      addAsAdditionalDevice?: boolean
    } = {},
  ) {
    const {
      displayName = '',
      isRegistration = false,
      addAsAdditionalDevice = false,
    } = opts

    // 1. get challenge options
    const passkeyOpts = await fetch(
      this.options.authUrl +
        `/webauth-challenge-request?registration=${
          isRegistration ? 'true' : ''
        }&displayName=${displayName}`,
      { credentials: 'include' },
    ).then(processResponse)

    // 2. ask user to register
    let attResp
    try {
      if (!passkeyOpts.user?.id) {
        attResp = await startAuthentication({
          optionsJSON: passkeyOpts,
        })
      } else {
        attResp = await startRegistration({
          optionsJSON: passkeyOpts,
        })
      }
    } catch (error: any) {
      if (error.name === 'InvalidStateError') {
        alert(
          'Error: Authenticator was probably already registered by user',
        )
      } else {
        alert(error.message)
      }

      throw error
    }

    // 3. verify response
    const res = await fetch(
      this.options.authUrl +
        `/webauth-challenge-complete?displayName=${displayName}&addAsAdditionalDevice=${
          addAsAdditionalDevice ? 'true' : ''
        }`,
      {
        method: 'POST',
        body: JSON.stringify(attResp),
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      },
    ).then(processResponse)

    await this.options.storage.setItem(USER_STORAGE_KEY, res)

    return res as IdentityUser
  }

  async guestLogin() {
    const res = await fetch(this.options.authUrl + `/sign-out`, {
      credentials: 'include',
    }).then(processResponse)

    await this.options.storage.setItem(USER_STORAGE_KEY, res)

    return res as IdentityUser
  }

  async clearLoginData() {
    await this.options.storage.removeItem(USER_STORAGE_KEY)
  }

  getLastLoginData() {
    const s = localStorage.getItem(USER_STORAGE_KEY)
    if (!s) {
      return null
    }

    try {
      const res = JSON.parse(s)

      return res || null
    } catch {
      return null
    }
  }
}

export type IdentityUser = {
  name: string
  email: string
  userId: string
  sessionId: string
  verified: boolean
}
const processResponse = async (x: Response) => {
  const data = await x.json()

  if (!x.ok) {
    throw new Error(data.message)
  }

  return data
}
