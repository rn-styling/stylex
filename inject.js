import * as stylex from "@stylexjs/stylex";
import { StyleSheet } from "react-native-css-interop";
const url =
  require("react-native/Libraries/Core/Devtools/getDevServer")().url.replace(
    /(https?:\/\/.*)(:\d*\/)(.*)/,
    "$1$3"
  );

let queuedCSS = "";

const webSocket = new globalThis.WebSocket(`${url}:9002`);
webSocket.addEventListener("open", () => {
  if (queuedCSS) {
    webSocket.send(JSON.stringify({ type: "inject", css: queuedCSS }));
  }
});
webSocket.addEventListener("message", (event) => {
  StyleSheet.register(JSON.parse(event.data));
});

stylex.inject = (css, _value) => {
  if (webSocket.readyState !== webSocket.OPEN) {
    queuedCSS += css;
  } else {
    webSocket.send(JSON.stringify({ type: "inject", css }));
  }
};
