const fs = require("fs");
const { resolve } = require("path");
const { utils } = require("@stylexjs/shared");
const template = require("@babel/template").default;
const { addSideEffect, addNamed } = require("@babel/helper-module-imports");
const {
  cssToReactNativeRuntime,
} = require("react-native-css-interop/css-to-rn");

module.exports = function (babel) {
  const { types: t, ...other } = babel;
  const env = babel.getEnv();
  let caller;
  other.caller(($caller) => {
    caller = $caller;
    return `${caller.bundler}-${caller.platform}`;
  });

  if (caller.platform === "web") {
    return web(env);
  } else {
    return native(env);
  }
};

function web(env) {
  if (env === "development") {
    return {};
  } else {
    return {
      visitor: {
        Program(path, state) {
          if (state.file.metadata.stylex?.length) {
            const collectedCSS = styleXPlugin.processStylexRules(
              state.file.metadata.stylex
            );

            const filenameHash = utils.hash(state.filename);
            const cacheDir = resolve(state.cwd, "./node_modules/.cache/stylex");
            const outputFile = resolve(cacheDir, `./${filenameHash}.css`);

            fs.mkdirSync(cacheDir, { recursive: true });
            fs.writeFileSync(outputFile, collectedCSS);

            addSideEffect(path, resolve(state.fileName, outputFile));
          }
        },
      },
    };
  }
}

function native(env) {
  if (env === "development") {
    return {
      visitor: {
        Program(path, state) {
          if (state.file.metadata.stylex?.length) {
            const collectedCSS = styleXPlugin
              .processStylexRules(state.file.metadata.stylex)
              .replace(/\:not\(#\\#\)/g, "");

            const STYLESHEET = addNamed(
              path,
              "StyleSheet",
              "react-native-css-interop",
              {
                nameHint: "InteropStyleSheet",
              }
            );

            const DATA = t.identifier(
              JSON.stringify(cssToReactNativeRuntime(collectedCSS))
            );

            const expression = template`STYLESHEET.register(DATA)`({
              STYLESHEET,
              DATA,
            });

            // Append the expression to the end of the program body
            path.pushContainer("body", expression);
          }
        },
      },
    };
  } else {
    return {
      visitor: {
        Program(path, state) {
          // Check if the filename is 'client.js'
          if (state.filename.endsWith("/client.ts")) {
            return;
          }

          // Flag to check if import/require exists
          let hasStylexImport = false;

          path.node.body.forEach((node) => {
            // Check if "@stylexjs/stylex" is either imported or required
            if (
              t.isImportDeclaration(node) &&
              node.source.value === "@stylexjs/stylex"
            ) {
              hasStylexImport = true;
            } else if (t.isVariableDeclaration(node)) {
              node.declarations.forEach((declaration) => {
                if (
                  t.isCallExpression(declaration.init) &&
                  declaration.init.callee.name === "require" &&
                  declaration.init.arguments[0].value === "@stylexjs/stylex"
                ) {
                  hasStylexImport = true;
                }
              });
            }
          });

          if (hasStylexImport) {
            addSideEffect(path, "@rn-styling/stylex/inject");
          }
        },
      },
    };
  }
}
