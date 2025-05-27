import {
  connect,
  DebugEvents,
  Events,
  JSONCodec,
  type NatsConnection,
} from 'nats.ws'
import { AuthService } from './auth.service'

type Config = {
  natsUrl: string
}

const jsonCodec = JSONCodec()

export class NatsService<TApi> {
  onStatusChange?: (isConnected: boolean) => void

  private nc?: NatsConnection
  private sessionId: string = ''
  private userId: string = ''

  private globalPrefix = ''

  private resolveConnected = (_: unknown) => {}
  isConnected = new Promise(
    resolve => (this.resolveConnected = resolve),
  )

  constructor(private config: Config) {}

  async connect(
    natsServerUrls?: string[],
    user?: IdentityUser,
    prefix?: string,
  ) {
    const finalNatsServerUrls = natsServerUrls ?? [
      this.config.natsUrl,
    ]

    this.nc = await connect({
      servers: finalNatsServerUrls,
    })

    const userInfo =
      user ?? new AuthService({ authUrl: '' }).getLastLoginData()

    if (!userInfo) {
      throw new Error(
        'Please authenticate first by calling `auth` apis',
      )
    }

    this.userId = userInfo.userId
    this.sessionId = userInfo.sessionId

    this.globalPrefix = prefix ?? ''

    this.resolveConnected(true)

    this.onStatusChange?.(true)
    console.log(
      '[nats] connected.',
      this.globalPrefix ? `(prefix: ${this.globalPrefix})` : '',
    )

    // Monitor connection status
    ;(async () => {
      for await (const status of this.nc!.status()) {
        if (status.type !== DebugEvents.PingTimer) {
          console.log('[nats] connection status:', status.type)
        }

        switch (status.type) {
          case Events.Reconnect:
            this.onStatusChange?.(true)
            break

          case Events.Disconnect:
          case Events.Error:
          case DebugEvents.Reconnecting:
            this.onStatusChange?.(false)
            break
        }
      }
    })()
  }

  async disconnect() {
    await this.nc?.drain()
    await this.nc?.close()
  }

  async publish<TSubject extends keyof TApi & string>(
    subject: TSubject,
    data: InferReturnType<TApi, TSubject>,
  ) {
    await this.isConnected

    if (!this.nc) {
      throw new Error('[nats] not connected')
    }

    try {
      const finalSubject = this.buildSubject(subject)

      console.debug('[nats]>>', finalSubject)

      this.nc.publish(finalSubject, jsonCodec.encode(data))
    } catch (error) {
      console.error('[nats] publish failed:', error)
      throw error
    }
  }

  async call<TSubject extends keyof TApi & string>(
    subject: TSubject,
    data: InferProps<TApi, TSubject>,
    opts?: { timeoutInMs?: number },
  ): Promise<InferReturnType<TApi, TSubject>> {
    await this.isConnected

    if (!this.nc) {
      throw new Error('[nats] not connected')
    }

    try {
      const finalSubject = this.buildSubject(subject)

      console.debug('[nats]>>', finalSubject)

      const response = await this.nc.request(
        finalSubject,
        jsonCodec.encode(data),
        { timeout: opts?.timeoutInMs ?? 5000 },
      )
      const result:
        | { ok: true; data: any }
        | { ok: false; message: string } = jsonCodec.decode(
        response.data,
      ) as any

      if (!result.ok) {
        throw new Error(result.message)
      }

      return result.data
    } catch (error) {
      console.error('[nats] request failed:', error)
      throw new Error('Api call failed.')
    }
  }

  async on<TSubject extends keyof TApi & string>(
    subject: TSubject,
    cb: (
      data: InferReturnType<TApi, TSubject>,
      ctx: {
        subject: string
        userId: string
        sessionId: string
      },
    ) => void,
  ) {
    await this.isConnected

    if (!this.nc) {
      throw new Error('[nats] not connected')
    }

    const prefix = this.globalPrefix ? `${this.globalPrefix}.` : ''
    const finalSubject = prefix + subject + '.>'

    const subscription = this.nc!.subscribe(finalSubject)

    ;(async () => {
      for await (const message of subscription) {
        try {
          console.debug('[nats]<<', message.subject)

          const subjectParts = message.subject.split('.')

          // -- process prefix --
          if (
            this.globalPrefix &&
            subjectParts[0] !== this.globalPrefix
          ) {
            console.log('[nats]', 'Skipped - ' + message.subject)
            continue
          }

          if (subjectParts[0] === 'dev') {
            // remove the first element / prefix
            subjectParts.shift()
          }
          // -- process prefix --

          const subject = subjectParts
            .slice(0, subjectParts.length - 2)
            .join('.')
          const userId = subjectParts[subjectParts.length - 2]
          const sessionId = subjectParts[subjectParts.length - 1]

          const decodedMessage = jsonCodec.decode(message.data)

          cb(decodedMessage as any, {
            subject,
            userId,
            sessionId,
          })
        } catch (err) {
          console.error('[nats] subscribe error', err)
        }
      }
    })()

    return () => subscription.unsubscribe()
  }

  async handler<TSubject extends keyof TApi & string>(
    subject: TSubject,
    cb: (
      data: InferProps<TApi, TSubject>,
      ctx: {
        subject: string
        userId: string
        sessionId: string
      },
    ) => Promise<InferReturnType<TApi, TSubject>>,
  ) {
    await this.isConnected

    if (!this.nc) {
      throw new Error('[nats] not connected')
    }

    const prefix = this.globalPrefix ? `${this.globalPrefix}.` : ''
    const finalSubject = prefix + subject + '.>'

    const subscription = this.nc!.subscribe(finalSubject)

    ;(async () => {
      for await (const message of subscription) {
        try {
          console.debug('[nats]<<', message.subject)

          const subjectParts = message.subject.split('.')

          // -- process prefix --
          if (
            this.globalPrefix &&
            subjectParts[0] !== this.globalPrefix
          ) {
            console.log('[nats]', 'Skipped - ' + message.subject)
            continue
          }

          if (subjectParts[0] === 'dev') {
            // remove the first element / prefix
            subjectParts.shift()
          }
          // -- process prefix --

          const subject = subjectParts
            .slice(0, subjectParts.length - 2)
            .join('.')
          const userId = subjectParts[subjectParts.length - 2]
          const sessionId = subjectParts[subjectParts.length - 1]

          const decodedMessage = jsonCodec.decode(message.data)

          cb(decodedMessage as any, {
            subject,
            userId,
            sessionId,
          })
            .then(res => {
              if (message.reply) {
                message.respond(
                  jsonCodec.encode({
                    ok: true,
                    data: res,
                  }),
                )
              }
            })
            .catch(err => {
              console.error('[nats] handle', err)

              if (message.reply) {
                message.respond(
                  jsonCodec.encode({
                    ok: false,
                    message: err.message,
                  }),
                )
              }
            })
        } catch (err: any) {
          console.error('[nats] handle', err)

          if (message.reply) {
            message.respond(
              jsonCodec.encode({
                ok: false,
                message: err.message,
              }),
            )
          }
        }
      }
    })()

    return () => subscription.unsubscribe()
  }

  private buildSubject(subject: string) {
    return [this.globalPrefix, subject, this.userId, this.sessionId]
      .filter(x => x)
      .join('.')
  }
}

type IdentityUser = {
  userId: string
  sessionId: string
}

type InferProps<
  TApi,
  TSubject extends keyof TApi,
> = TApi[TSubject] extends (args: infer TProps) => unknown
  ? TProps
  : {}

type InferReturnType<
  TApi,
  TSubject extends keyof TApi,
> = TApi[TSubject] extends (args: any) => infer TResult
  ? TResult
  : TApi[TSubject]
