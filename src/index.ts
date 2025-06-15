import { AuthService } from './auth.service'
import { CryptoService } from './crypto.service'
import { NatsService } from './nats.service'
import { StorageService } from './storage.service'
import { EdgeTtsService } from './tts.service'

export { type IdentityUser } from './auth.service'
export { NatsService } from './nats.service'
export { VoicevoxTtsService } from './voicevoxTts'

type Config = {
  debug: boolean
  authUrl: string
  natsUrl: string

  storage: StorageService
}

const defaultConfig: Config = {
  debug: false,
  authUrl: 'https://auth.jok.io',
  natsUrl: 'https://nats.jok.io',
  storage: new StorageService(),
}

const auth = new AuthService(defaultConfig)

export const jok = {
  setup(config: Partial<Config>) {
    if (config.authUrl || config.storage) {
      this.auth = new AuthService({
        authUrl: config.authUrl ?? this.auth.url,
        storage: config.storage ?? this.storage,
      })
    }

    if (config.natsUrl || config.storage) {
      this.nats = new NatsService({
        natsUrl: config.natsUrl ?? this.nats.url,
        auth: this.auth,
      })
    }
  },

  auth,

  storage: new StorageService(),

  tts: new EdgeTtsService(),

  nats: new NatsService({ ...defaultConfig, auth }),

  crypto: new CryptoService(),
}
