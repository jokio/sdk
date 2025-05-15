export function playAudioFromBuffer(buffer: ArrayBuffer) {
  const blob = new Blob([buffer], { type: 'audio/mpeg' }) // or 'audio/wav' depending on your format
  const url = URL.createObjectURL(blob)

  const audio = new Audio()
  audio.src = url
  //   audio.play()

  // Optional: cleanup after playback
  audio.onended = () => {
    URL.revokeObjectURL(url)
  }

  return audio
}
