const { Server } = require("ws");
const {
  cssToReactNativeRuntime,
} = require("react-native-css-interop/css-to-rn");

module.exports = function withStyleX(config) {
  const previousTransformOptions = config.transformer?.getTransformOptions;
  config.transformer.getTransformOptions = (
    entryPoints,
    options,
    getDependenciesOf
  ) => {
    if (options.platform !== "web" && options.hot && options.dev) {
      const wss = new Server({ port: 9002 });
      const connections = new Set();
      let css = "";
      const processCss = debounce(() => {
        const data = JSON.stringify(cssToReactNativeRuntime(css));
        css = "";
        for (const ws of connections) {
          ws.send(data);
        }
      });

      wss.on("connection", (ws) => {
        connections.add(ws);
        ws.on("close", () => connections.delete(ws));
        ws.on("message", function message(data) {
          data = JSON.parse(data);
          if (data.type !== "inject") return;
          css += `${data.css}\n`;
          processCss();
        });
      });
    }

    return previousTransformOptions?.(entryPoints, options, getDependenciesOf);
  };
  return config;
};

const debounce = (callback, wait) => {
  let timeoutId = null;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback.apply(null, args);
    }, wait);
  };
};
