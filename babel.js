const styleXPlugin = require("@stylexjs/babel-plugin");

module.exports = function (babel) {
  return {
    plugins: [
      [
        styleXPlugin,
        {
          stylexSheetName: "./stylex.css",
          dev: babel.getEnv() === "development",
          unstable_moduleResolution: {
            type: "commonJS",
            rootDir: __dirname,
          },
        },
      ],
      require("./babel-plugin").default,
      [
        "@babel/plugin-transform-react-jsx",
        {
          runtime: "automatic",
          importSource: "react-native-css-interop",
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
