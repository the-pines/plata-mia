import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import TypewriterLogo from './TypewriterLogo.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-title-after': () => h(TypewriterLogo),
    })
  },
}
