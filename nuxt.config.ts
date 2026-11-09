// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-01",
  devtools: { enabled: false },
  modules: [
    "@nuxt/ui",
    "@nuxt/test-utils",
    "@nuxt/eslint",
    "@nuxt/image",
    "nuxt-mongoose",
  ],
  mongoose: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/benchkit",
    options: {},
    modelsDir: "models",
    devtools: true,
  },
  runtimeConfig: {
    auth: {
      // NUXT_AUTH_TRUST_EASY_AUTH=true: identify callers by the Azure App
      // Service Authentication principal header (mapped to User.azureId).
      // Only enable when every request reaches the app through Easy Auth.
      trustEasyAuth: false,
      // NUXT_AUTH_DEV_USER_EMAIL: local `nuxt dev` only; signs every request
      // in as this user (created as an admin if missing).
      devUserEmail: "",
    },
  },
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      title: "BenchKit",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
      link: [{ rel: "icon", type: "image/svg", href: "/manulife.svg" }],
    },
  },
});
