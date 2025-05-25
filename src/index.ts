import { AuthService } from './auth.service'
import { CryptoService } from './crypto.service'
import { EdgeTtsService } from './edgeTts.service'
import { NatsService } from './nats.service'
import { VoicevoxTtsService } from './tts.service'

export { NatsService } from './nats.service'

type Config = {
  debug: boolean
  authUrl: string
  voicevoxUrl: string
}

const defaultConfig: Config = {
  debug: false,
  authUrl: 'https://auth.jok.io',
  voicevoxUrl: 'https://voicevox.fly.dev',
}

export const jok = {
  setup(config: Partial<Config>) {
    if (config.authUrl) {
      this.auth = new AuthService({ authUrl: config.authUrl })
    }
  },

  auth: new AuthService(defaultConfig),

  edgeTts: new EdgeTtsService(),

  voicevoxTts: new VoicevoxTtsService(defaultConfig),

  nats: new NatsService(),

  crypto: new CryptoService(),
}
