export default {
  // Target: https://go.nuxtjs.dev/config-target
  target: 'static',
  ssr:    false,

  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    titleTemplate: '%s',
    title:         'sogeBot - admin page',
    htmlAttrs:     { lang: 'en' },
    meta:          [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        hid: 'description', name: 'description', content: '',
      },
    ],
    link: [{
      rel: 'icon', type: 'image/x-icon', href: '/favicon.ico',
    }],
  },

  env: { isNuxtDev: process.env.NODE_ENV === 'development', BUILD: 'web' },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: [
    '@/assets/colors.scss',
    '@/assets/global.scss',
    '@/assets/transitions.scss',
    '@/assets/letter-animations.scss',
  ],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [
    '@/plugins/remove-shift-selection',
  ],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
    // https://go.nuxtjs.dev/typescript
    '@nuxt/typescript-build',
    // https://go.nuxtjs.dev/stylelint
    '@nuxtjs/stylelint-module',
    // https://go.nuxtjs.dev/vuetify
    ['@nuxtjs/vuetify', { treeShake: true }],
    // https://composition-api.nuxtjs.org/
    '@nuxtjs/composition-api/module',
  ],

  vuetify: {
    icons:      { iconfont: 'mdiSvg' },
    breakpoint: { mobileBreakpoint: 'sm' },
    theme:      {
      options: { customProperties: true },
      dark:    true,
      themes:  { dark: { primary: '#FF9800' } },
    },
  },

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
    '@nuxtjs/axios',
    '@nuxtjs/proxy',
  ],

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {},

  router: {
    mode: 'hash',

    extendRoutes (routes, resolve) {
      routes.push({
        path:       '/manage/viewers/:id',
        components: { default: resolve(__dirname, 'pages/manage/viewers') },
      });
      routes.push({
        name:       'RegistryAlertsEdit',
        path:       '/registry/alerts/:id',
        components: { default: resolve(__dirname, 'pages/registry/alerts/edit') },
      });
      routes.push({
        name:       'RegistryRandomizerEdit',
        path:       '/registry/randomizer/:id',
        components: { default: resolve(__dirname, 'pages/registry/randomizer/edit') },
      });
      routes.push({
        name:       'RegistryGoalsEdit',
        path:       '/registry/goals/:id',
        components: { default: resolve(__dirname, 'pages/registry/goals/edit') },
      });
    },
  },

  axios: { proxy: true },

  // enable api proxy
  ...process.env.NODE_ENV === 'development' && {
    proxy: {
      '/api': {
        changeOrigin: true,
        target:       'http://localhost:20000',
      },
      '/credentials': {
        changeOrigin: true,
        target:       'http://localhost:3001',
      },
    },
  },
};
