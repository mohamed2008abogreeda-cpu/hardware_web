import { ref, onUnmounted } from 'vue'

export function useVoiceRecorder() {
  const isRecording = ref(false)
  const recordingTime = ref(0)
  const audioBlob = ref<Blob | null>(null)
  let mediaRecorder: MediaRecorder | null = null
  let timerInterval: ReturnType<typeof setInterval> | null = null
  let chunks: Blob[] = []

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder = new MediaRecorder(stream)
      chunks = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      mediaRecorder.onstop = () => {
        audioBlob.value = new Blob(chunks, { type: 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      isRecording.value = true
      recordingTime.value = 0
      timerInterval = setInterval(() => {
        recordingTime.value++
      }, 1000)
    } catch (err) {
      console.error('Failed to start recording:', err)
      throw err
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording.value) {
      mediaRecorder.stop()
      isRecording.value = false
      if (timerInterval) clearInterval(timerInterval)
    }
  }

  const cancelRecording = () => {
    if (mediaRecorder && isRecording.value) {
      mediaRecorder.stop()
      isRecording.value = false
      audioBlob.value = null
      if (timerInterval) clearInterval(timerInterval)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  onUnmounted(() => {
    if (timerInterval) clearInterval(timerInterval)
  })

  return {
    isRecording,
    recordingTime,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
    formatTime
  }
}
