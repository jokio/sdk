import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser'

type Config = {
  authUrl: string
}

const USER_STORAGE_KEY = 'LAST_AUTH_DATA'

export class AuthService {
  constructor(private config: Config) {}

  async requestEmailLogin(
    email: string,
    returnUrl: string = location.href,
  ) {
    const res = await fetch(
      this.config.authUrl +
        `/email-verification-request/${email}?returnUrl=${returnUrl}`,
      { credentials: 'include' },
    ).then(processResponse)

    return res as boolean
  }

  async completeEmailLogin(email: string, otpCode: string) {
    const res = await fetch(
      this.config.authUrl +
        `/email-verification-complete/${email}/${otpCode}`,
      { credentials: 'include' },
    ).then(processResponse)

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res))

    return res as IdentityUser
  }

  async requestPasskeyLogin(
    displayName: string = '',
    isRegistration: boolean = false,
    addAsAdditionalDevice = false,
  ) {
    // 1. get challenge options
    const opts = await fetch(
      this.config.authUrl +
        `/webauth-challenge-request?registration=${
          isRegistration ? 'true' : ''
        }&displayName=${displayName}`,
      { credentials: 'include' },
    ).then(processResponse)

    // 2. ask user to register
    let attResp
    try {
      if (!opts.user?.id) {
        attResp = await startAuthentication({ optionsJSON: opts })
      } else {
        attResp = await startRegistration({ optionsJSON: opts })
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
      this.config.authUrl +
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

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res))

    return res as IdentityUser
  }

  async guestSignIn() {
    const res = await fetch(this.config.authUrl + `/sign-out`, {
      credentials: 'include',
    }).then(processResponse)

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res))

    return res as IdentityUser
  }

  async clearLoginData() {
    localStorage.removeItem(USER_STORAGE_KEY)
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
