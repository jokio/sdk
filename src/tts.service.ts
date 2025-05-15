import { playAudioFromBuffer } from './common/playAudioFromBuffer'

type Config = {
  voicevoxUrl: string
}

export class VoicevoxTtsService {
  constructor(private config: Config) {}

  async getAudioBuffer(text: string, voice: string) {
    const audioQueryResponse = await fetch(
      `${
        this.config.voicevoxUrl
      }/audio_query?text=${encodeURIComponent(text)}&speaker=${
        voice || 3
      }`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
      },
    )

    if (!audioQueryResponse.ok) {
      throw new Error(
        `Audio query failed: ${audioQueryResponse.statusText}`,
      )
    }

    const audioQuery = await audioQueryResponse.json()

    // Step 2: Synthesize the speech
    const synthesisResponse = await fetch(
      `${this.config.voicevoxUrl}/synthesis?speaker=${voice}`,
      {
        method: 'POST',
        headers: {
          Accept: 'audio/wav',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(audioQuery),
      },
    )

    if (!synthesisResponse.body) {
      return null
    }

    const reader = synthesisResponse.body.getReader()
    const chunks = []

    // Step 1: Read all the chunks
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    // Step 2: Concatenate into one Uint8Array
    const totalLength = chunks.reduce(
      (acc, chunk) => acc + chunk.length,
      0,
    )
    const audioData = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      audioData.set(chunk, offset)
      offset += chunk.length
    }

    return audioData.buffer
  }

  async getAudio(text: string, voice: string) {
    return this.getAudioBuffer(text, voice).then(x =>
      x ? playAudioFromBuffer(x) : null,
    )
  }

  async getVoices(): Promise<any[]> {
    const speakers = await fetch(
      `${this.config.voicevoxUrl}/speakers`,
    ).then(x => x.json())

    return speakers.flatMap((x: any) =>
      x.styles.map((y: any) => ({
        id: y.id.toString(),
        locale: 'ja-JP',
        description: `${x.name} - ${y.name}`,
      })),
    )
  }
}
