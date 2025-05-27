import { playAudioFromBuffer } from './common/playAudioFromBuffer'

export class EdgeTtsService {
  async getAudioBuffer(
    text: string,
    voice: string,
    options?: { pitch?: string; rate?: string; volume?: string },
  ): Promise<ArrayBuffer> {
    const audioChunks: Uint8Array[] = []
    const reqId = crypto.randomUUID() // Supported in most modern browsers

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(
        `${Constants.WSS_URL}?trustedclienttoken=${Constants.TRUSTED_CLIENT_TOKEN}&ConnectionId=${reqId}`,
      )

      ws.binaryType = 'arraybuffer'

      const SSML_text = getSSML(text, voice, options)

      ws.addEventListener('open', () => {
        const configMessage = buildTTSConfigMessage()
        ws.send(configMessage)

        const speechMessage =
          `X-RequestId:${reqId}\r\n` +
          `Content-Type:application/ssml+xml\r\n` +
          `X-Timestamp:${new Date().toISOString()}Z\r\n` +
          `Path:ssml\r\n\r\n` +
          SSML_text

        ws.send(speechMessage)
      })

      ws.addEventListener('message', event => {
        const data = event.data

        if (data instanceof ArrayBuffer) {
          const buffer = new Uint8Array(data)
          const needle = new TextEncoder().encode('Path:audio\r\n')

          const index = findSubarray(buffer, needle)
          if (index !== -1) {
            const audioData = buffer.subarray(index + needle.length)
            audioChunks.push(audioData)
          }

          const textData = new TextDecoder().decode(buffer)
          if (textData.includes('Path:turn.end')) {
            ws.close()
          }
        } else {
          if (data.includes('Path:turn.end')) {
            ws.close()
          }
        }
      })

      ws.addEventListener('close', () => {
        if (!audioChunks.length) {
          reject('No audio data available to save.')
          return
        }

        // Combine all Uint8Arrays into one ArrayBuffer
        const totalLength = audioChunks.reduce(
          (acc, chunk) => acc + chunk.length,
          0,
        )
        const finalBuffer = new Uint8Array(totalLength)
        let offset = 0
        for (const chunk of audioChunks) {
          finalBuffer.set(chunk, offset)
          offset += chunk.length
        }

        resolve(finalBuffer.buffer) // ArrayBuffer
      })

      ws.addEventListener('error', err => {
        reject(err)
      })
    })
  }

  async getAudio(
    text: string,
    voice: string,
    options?: { pitch?: string; rate?: string; volume?: string },
  ) {
    return this.getAudioBuffer(text, voice, options).then(x =>
      playAudioFromBuffer(x),
    )
  }

  async getVoices(): Promise<any[]> {
    const response = await fetch(
      `${Constants.VOICES_URL}?trustedclienttoken=${Constants.TRUSTED_CLIENT_TOKEN}`,
    )
    const data = await response.json()
    return data.map((voice: any) => ({
      id: voice.ShortName,
      locale: voice.Locale,
      description: voice.FriendlyName,
    }))
  }
}

const Constants = {
  TRUSTED_CLIENT_TOKEN: '6A5AA1D4EAFF4E9FB37E23D68491D6F4',
  WSS_URL:
    'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1',
  VOICES_URL:
    'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list',
}

const buildTTSConfigMessage = (): string => {
  return (
    `X-Timestamp:${new Date().toISOString()}Z\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
    `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":false,"wordBoundaryEnabled":true},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`
  )
}

const getSSML = (
  text: string,
  voice: string,
  options: any = {},
): string => {
  options.pitch = options.pitch?.replace('hz', 'Hz')
  const pitch = options.pitch || '0Hz' // this.validatePitch(options.pitch || '0Hz');
  const rate = options.rate || '0%' // this.validateRate(options.rate || '0%');
  const volume = options.volume || '0%' // this.validateVolume(options.volume || '0%');

  return `<speak version='1.0' xml:lang='en-US'><voice name='${voice}'><prosody pitch='${pitch}' rate='${rate}' volume='${volume}'>${text}</prosody></voice></speak>`
}

// Helper: Finds a subarray inside another Uint8Array
function findSubarray(
  haystack: Uint8Array,
  needle: Uint8Array,
): number {
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    let match = true
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        match = false
        break
      }
    }
    if (match) return i
  }
  return -1
}
