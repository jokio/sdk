import { AuthService } from './auth.service'
import { CryptoService } from './crypto.service'
import { NatsService } from './nats.service'
import { EdgeTtsService } from './tts.service'

export { type IdentityUser } from './auth.service'
export { NatsService } from './nats.service'
export { VoicevoxTtsService } from './voicevoxTts'

type Config = {
  debug: boolean
  authUrl: string
  natsUrl: string
}

const defaultConfig: Config = {
  debug: false,
  authUrl: 'https://auth.jok.io',
  natsUrl: 'https://natsx.jok.io',
}

export const jok = {
  setup(config: Partial<Config>) {
    if (config.authUrl) {
      this.auth = new AuthService({ authUrl: config.authUrl })
    }

    if (config.natsUrl) {
      this.nats = new NatsService({ natsUrl: config.natsUrl })
    }
  },

  auth: new AuthService(defaultConfig),

  tts: new EdgeTtsService(),

  nats: new NatsService(defaultConfig),

  crypto: new CryptoService(),
}
