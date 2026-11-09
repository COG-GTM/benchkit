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
    public: {
      // Request body limits in bytes, enforced by server/middleware/body-limit.ts.
      // Override with e.g. NUXT_PUBLIC_BODY_LIMITS_MAX_UPLOAD_BYTES.
      bodyLimits: {
        maxUploadBytes: 20 * 1024 * 1024,
        maxUploadFileBytes: 10 * 1024 * 1024,
        maxUploadFiles: 20,
        maxJsonBodyBytes: 1024 * 1024,
      },
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
