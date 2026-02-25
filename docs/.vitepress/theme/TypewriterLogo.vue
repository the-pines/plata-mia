<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const WORD = 'plata_mia'
const TYPE_SPEED = 120
const ERASE_SPEED = 80
const PAUSE_FULL = 2000
const PAUSE_EMPTY = 800

const text = ref('')
const erasing = ref(false)
let timeout = null

function tick() {
  if (!erasing.value) {
    if (text.value.length < WORD.length) {
      text.value = WORD.slice(0, text.value.length + 1)
      timeout = setTimeout(tick, TYPE_SPEED)
    } else {
      timeout = setTimeout(() => {
        erasing.value = true
        tick()
      }, PAUSE_FULL)
    }
  } else {
    if (text.value.length > 0) {
      text.value = text.value.slice(0, -1)
      timeout = setTimeout(tick, ERASE_SPEED)
    } else {
      timeout = setTimeout(() => {
        erasing.value = false
        tick()
      }, PAUSE_EMPTY)
    }
  }
}

onMounted(() => {
  tick()
})

onUnmounted(() => {
  if (timeout) clearTimeout(timeout)
})
</script>

<template>
  <span class="typewriter-logo">
    <span class="typewriter-dot"></span>
    <span>{{ text }}<span class="typewriter-cursor">_</span></span>
  </span>
</template>
