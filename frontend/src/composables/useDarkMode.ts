import { ref, onMounted, watch } from 'vue';

export function useDarkMode() {
  const isDark = ref(false);

  // Initialize
  onMounted(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark') {
        isDark.value = true;
      } else if (stored === 'light') {
        isDark.value = false;
      } else {
        // System preference
        isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      applyTheme();
    }
  });

  // Watch for changes and save
  watch(isDark, () => {
    applyTheme();
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
    }
  });

  function applyTheme() {
    if (typeof document !== 'undefined') {
      if (isDark.value) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  function toggle() {
    isDark.value = !isDark.value;
  }

  return { isDark, toggle };
}
