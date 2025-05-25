const uint2hex = (x: Uint8Array) =>
  [...x].map(x => x.toString(16).padStart(2, '0')).join('')

const hex2uint = (hex: string) =>
  new Uint8Array(
    hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)),
  )

const ab2b64 = (ab: any) =>
  btoa(String.fromCharCode(...new Uint8Array(ab)))

const b642ab = (str: string) =>
  Uint8Array.from(atob(str), c => c.charCodeAt(0)).buffer

const sha256 = async (buffer: ArrayBuffer) =>
  await crypto.subtle.digest('SHA-256', buffer)

const textEncoder = new TextEncoder()

export class CryptoService {
  async createSessionKeyPair() {
    return await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      false, // non-extractable private key
      ['deriveKey', 'deriveBits'],
    )
  }

  async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const spki = await crypto.subtle.exportKey('spki', publicKey)

    return ab2b64(spki)
  }

  async deriveAESKey(privateKey: CryptoKey, publicKeyString: string) {
    const spki = b642ab(publicKeyString)

    const publicKey = await crypto.subtle.importKey(
      'spki',
      spki,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      [],
    )

    // Derive key directly
    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: publicKey,
      },
      privateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )

    return aesKey
  }

  async exportRawKey(key: CryptoKey) {
    const raw = await crypto.subtle.exportKey('raw', key)
    return uint2hex(new Uint8Array(raw))
  }

  async encrypt(text: string, key: CryptoKey) {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoded = new TextEncoder().encode(text)
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded,
    )

    return `${uint2hex(new Uint8Array(ciphertext))}_${uint2hex(iv)}`
  }

  async decrypt(encryptedText: string, key: CryptoKey) {
    const parts = encryptedText.split('_')

    const ciphertext = hex2uint(parts[0]).buffer
    const iv = hex2uint(parts[1])

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    )
    return new TextDecoder().decode(decrypted)
  }

  async hashString(text: string) {
    const hashBuffer = await sha256(textEncoder.encode(text).buffer)

    return ab2b64(hashBuffer)
  }
}
