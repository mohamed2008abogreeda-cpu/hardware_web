import posthog from 'posthog-js'

export function usePostHog() {
  // Check if we are in browser environment
  if (typeof window !== 'undefined') {
    posthog.init('phc_Dk6a5H5yZAEKo8VVm3nAEnQzRujKcBL6ifUhQGHvWFYf', {
      api_host: 'https://us.i.posthog.com',
      person_profiles: 'always',
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      // Enable robust session replay
      session_recording: {
        maskAllInputs: false, 
        maskInputOptions: {
          password: true
        }
      }
    })
  }

  return { posthog }
}
