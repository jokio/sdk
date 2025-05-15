import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser'

type Config = {
  authUrl: string
}

export class AuthService {
  constructor(private config: Config) { }

  async requestEmailLogin(email: string, returnUrl: string) {
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
      `/webauth-challenge-request?registration=${isRegistration ? 'true' : ''
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
      `/webauth-challenge-complete?displayName=${displayName}&addAsAdditionalDevice=${addAsAdditionalDevice ? 'true' : ''
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

    return res as IdentityUser
  }

  async signOut() {
    // 1. get challenge options
    const res = await fetch(this.config.authUrl + `/sign-out`, {
      credentials: 'include',
    }).then(processResponse)

    return res as IdentityUser
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
