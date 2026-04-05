import { onMounted, onUnmounted, type Ref } from 'vue'
import gsap from 'gsap'

export function useMagnetic(target: Ref<HTMLElement | null>, options = { strength: 0.5, scale: 1.05 }) {
  let boundRect: DOMRect

  const updateBounds = () => {
    if (target.value) {
      boundRect = target.value.getBoundingClientRect()
    }
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!target.value || !boundRect) return
    const x = e.clientX - boundRect.left - boundRect.width / 2
    const y = e.clientY - boundRect.top - boundRect.height / 2

    gsap.to(target.value, {
      x: x * options.strength,
      y: y * options.strength,
      scale: options.scale,
      duration: 0.8,
      ease: 'power3.out'
    })
  }

  const onMouseLeave = () => {
    if (!target.value) return
    gsap.to(target.value, {
      x: 0,
      y: 0,
      scale: 1,
      duration: 1,
      ease: 'elastic.out(1, 0.3)'
    })
  }

  onMounted(() => {
    if (!target.value) return
    updateBounds()
    window.addEventListener('resize', updateBounds)
    target.value.addEventListener('mousemove', onMouseMove)
    target.value.addEventListener('mouseleave', onMouseLeave)
  })

  onUnmounted(() => {
    if (!target.value) return
    window.removeEventListener('resize', updateBounds)
    target.value.removeEventListener('mousemove', onMouseMove)
    target.value.removeEventListener('mouseleave', onMouseLeave)
  })
}
