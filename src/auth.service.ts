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

  onUserDataUpdate?: (data: UserAuthData) => void

  isAuthenticated: Promise<void>
  private isAuthenticatedResolver: () => void = () => {}

  constructor(private options: Options) {
    this.isAuthenticated = new Promise<void>(
      resolve => (this.isAuthenticatedResolver = resolve),
    )
  }

  async init() {
    const savedData = localStorage.getItem(USER_STORAGE_KEY)
    if (savedData) {
      try {
        const userData = JSON.parse(savedData)

        this.onUserDataUpdate?.(userData)

        this.isAuthenticatedResolver()
      } catch (err) {}
    } else {
      const userData = await this.me()

      this.onUserDataUpdate?.(userData)

      this.isAuthenticatedResolver()
    }
  }

  async me() {
    const data = await fetch(this.options.authUrl + '/me', {
      credentials: 'include',
    }).then(x => x.json())

    return data as UserAuthData
  }

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

    this.onUserDataUpdate?.(res)

    return res as UserAuthData
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

    this.onUserDataUpdate?.(res)

    return res as UserAuthData
  }

  async guestLogin() {
    const res = await fetch(this.options.authUrl + `/sign-out`, {
      credentials: 'include',
    }).then(processResponse)

    await this.options.storage.setItem(USER_STORAGE_KEY, res)

    this.onUserDataUpdate?.(res)

    return res as UserAuthData
  }

  getLastLoginData() {
    return this.options.storage.getItem<UserAuthData>(
      USER_STORAGE_KEY,
    )
  }
}

export type UserAuthData = {
  name: string
  email: string
  userId: string
  sessionId: string
  verified: boolean

  nats: {
    bearer_token: boolean
    pub: {
      allow: string[]
    }
    sub: {
      allow: string[]
    }
    limits: {
      max_msgs: number
      max_bytes: number
      max_msgs_per_subject: number
    }
  }
}
const processResponse = async (x: Response) => {
  const data = await x.json()

  if (!x.ok) {
    throw new Error(data.message)
  }

  return data
}
