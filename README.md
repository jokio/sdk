# @jokio/sdk

[![npm version](https://img.shields.io/npm/v/@jokio/sdk.svg?color=brightgreen)](https://www.npmjs.com/package/@jokio/sdk)
[![npm downloads](https://img.shields.io/npm/dm/@jokio/sdk.svg)](https://www.npmjs.com/package/@jokio/sdk)
[![npm license](https://img.shields.io/npm/l/@jokio/sdk.svg)](https://www.npmjs.com/package/@jokio/sdk)

SDK for building decentralised localfirst web apps.
Provides tts ai model integrations, realtime p2p communication & crypto encryptions.

# Examples

## Authentication

```ts
import { jok } from '@jokio/sdk'

// guest
{
  const userData = await jok.auth.guestLogin()
}

// passkeys
{
  // login with existing keys
  await jok.auth.requestPasskeyLogin()

  // login attempt with a specific displayName
  // acts like previous example if displayName not found
  await jok.auth.requestPasskeyLogin({ displayName })

  // registering a new passkey
  await jok.auth.requestPasskeyLogin({
    displayName,
    isRegistration: true,
  })
}

// email
{
  // 1. request otp code
  const isSent = await jok.auth.requestEmailLogin(email)

  // 2. complete process
  const userData = await jok.auth.completeEmailLogin(email, otpCode)
}
```

## Text to speech (TTS)

```ts
import { jok } from '@jokio/sdk'

// get available voices
const voices = await jok.tts.getVoices()

console.log(voices)

// convert text to audio file
const audio = await jok.tts.getAudio(
  'Hello there, how are you?',
  'en-US-AvaNeural',
)

audio.play()
```

## Real-time communication

Between users (browsers), using nats

```ts
import { jok } from '@jokio/sdk'

// Authentication should be done first

await jok.nats.connect()

await jok.nats.on('dev.test', (data, ctx) => {
  // in `ctx` you will receive caller's userId and sessionId
  console.log('Received event', data, ctx)
})

await jok.nats.publish('dev.test', {
  hello: 'world',
})
```

## P2P encrypted message exchange

Works directly in browser

```ts
import { jok } from '@jokio/sdk'

const kp1 = await jok.crypto.createSessionKeyPair()
const kp2 = await jok.crypto.createSessionKeyPair()

const p1 = await jok.crypto.exportPublicKey(kp1.publicKey)
const p2 = await jok.crypto.exportPublicKey(kp2.publicKey)

console.log({ p1, p2 })

const shared1 = await jok.crypto.deriveAESKey(kp1.privateKey, p2)
const shared2 = await jok.crypto.deriveAESKey(kp2.privateKey, p1)

// `shared1` and `shared2` keys will be the same.

const originalText = 'Hello World'

const encrypted = await jok.crypto.encrypt(originalText, shared1)
const decrypted = await jok.crypto.decrypt(encrypted, shared2)

console.log({
  match: originalText === decrypted,
  originalText,
  decrypted,
})
```

## Directly in HTML

You can use directly into html as well:

```html
<script type="module">
  import { jok } from 'https://esm.run/@jokio/sdk'

  async function textToAudio() {
    const audio = await jok.tts.getAudio(
      'Hello there, how are you?',
      'en-US-AvaNeural',
    )

    audio.play()
  }

  window.textToAudio = textToAudio
</script>
```
