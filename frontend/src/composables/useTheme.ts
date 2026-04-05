import { ref, watchEffect } from 'vue'

/**
 * Theme composable — dark/light mode per THEME-SYSTEM.md.
 */

const isDark = ref(!localStorage.getItem('theme') || localStorage.getItem('theme') === 'dark')

export function useTheme() {
  watchEffect(() => {
    document.documentElement.classList.toggle('light', !isDark.value)
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  })

  function toggleTheme() {
    isDark.value = !isDark.value
  }

  return {
    isDark,
    toggleTheme,
  }
}
