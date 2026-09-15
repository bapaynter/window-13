export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4
  },
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  css: ['~/assets/css/gov.css'],
  modules: [],
  app: {
    head: {
      title: 'Department of Soul Registry',
      htmlAttrs: { lang: 'en' }
    }
  }
})
