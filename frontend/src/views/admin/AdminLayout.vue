<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import DesktopAdminLayout from './layouts/DesktopAdminLayout.vue'
import MobileAdminLayout from './layouts/MobileAdminLayout.vue'

const isMobile = ref(false)

function checkScreenSize() {
  isMobile.value = window.innerWidth <= 992
}

onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})
</script>

<template>
  <MobileAdminLayout v-if="isMobile" />
  <DesktopAdminLayout v-else />
</template>
