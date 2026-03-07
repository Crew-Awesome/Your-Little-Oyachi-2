export default {
  app: {
    name: "Your Little Oyachi 2",
    version: "0.1.0",
    identifier: "com.immalloy.yourlittleoyachi2"
  },
  build: {
    bun: {
      entrypoint: "src/bun/main.ts"
    },
    views: {
      mainview: {
        entrypoint: "src/views/mainview/index.ts"
      }
    },
    copy: {
      "src/views/mainview/index.html": "views/mainview/index.html",
      "assets": "assets"
    }
  }
};
