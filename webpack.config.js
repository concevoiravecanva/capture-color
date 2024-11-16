require("dotenv").config();
const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const { DefinePlugin, optimize } = require("webpack");
const chalk = require("chalk");
const { transform } = require("@formatjs/ts-transformer");

function buildConfig({
  devConfig,
  appEntry = path.join(__dirname, "src", "index.tsx"),
  backendHost = process.env.CANVA_BACKEND_HOST || 'http://localhost:8080',
} = {}) {
  const mode = devConfig ? "development" : "production";

  if (backendHost.includes("localhost") && mode === "production") {
    console.warn(
      chalk.yellowBright.bold(
        "Warning: BACKEND_HOST is set to localhost for a production build."
      ),
      "This may not be intended for production use."
    );
  }

  return {
    mode,
    context: path.resolve(__dirname, "./"),
    entry: {
      app: appEntry,
    },
    target: "web",
    resolve: {
      alias: {
        assets: path.resolve(__dirname, "assets"),
        utils: path.resolve(__dirname, "utils"),
        styles: path.resolve(__dirname, "styles"),
        src: path.resolve(__dirname, "src"),
      },
      extensions: [".ts", ".tsx", ".js", ".css", ".svg", ".woff", ".woff2"],
    },
    infrastructureLogging: {
      level: "none",
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: "ts-loader",
              options: {
                transpileOnly: true,
                getCustomTransformers() {
                  return {
                    before: [
                      transform({
                        overrideIdFn: "[sha512:contenthash:base64:6]",
                      }),
                    ],
                  };
                },
              },
            },
          ],
        },
        {
          test: /\.css$/,
          exclude: /node_modules/,
          use: [
            "style-loader",
            {
              loader: "css-loader",
              options: {
                modules: true,
              },
            },
            {
              loader: "postcss-loader",
              options: {
                postcssOptions: {
                  plugins: [require("cssnano")({ preset: "default" })],
                },
              },
            },
          ],
        },
        {
          test: /\.(png|jpg|jpeg)$/i,
          type: "asset/inline",
        },
        {
          test: /\.(woff|woff2)$/,
          type: "asset/inline",
        },
        {
          test: /\.svg$/,
          oneOf: [
            {
              issuer: /\.[jt]sx?$/,
              resourceQuery: /react/,
              use: ["@svgr/webpack", "url-loader"],
            },
            {
              type: "asset/resource",
              parser: {
                dataUrlCondition: {
                  maxSize: 200,
                },
              },
            },
          ],
        },
        {
          test: /\.css$/,
          include: /node_modules/,
          use: [
            "style-loader",
            "css-loader",
            {
              loader: "postcss-loader",
              options: {
                postcssOptions: {
                  plugins: [require("cssnano")({ preset: "default" })],
                },
              },
            },
          ],
        },
      ],
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            format: {
              ascii_only: true,
            },
          },
        }),
      ],
    },
    output: {
      filename: `[name].js`,
      path: path.resolve(__dirname, "dist"),
      clean: true,
    },
    plugins: [
      new DefinePlugin({
        BACKEND_HOST: JSON.stringify(backendHost),
      }),
      new optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
    ],
    ...buildDevConfig(devConfig),
  };
}

function buildDevConfig(options) {
  if (!options) {
    return null;
  }

  const { port, enableHmr, appOrigin, appId, enableHttps, certFile, keyFile } = options;

  let devServer = {
    server: enableHttps
      ? {
          type: "https",
          options: {
            cert: certFile,
            key: keyFile,
          },
        }
      : "http",
    host: "localhost",
    historyApiFallback: {
      rewrites: [{ from: /^\/$/, to: "/app.js" }],
    },
    port,
    client: {
      logging: "verbose",
    },
    static: {
      directory: path.resolve(__dirname, "assets"),
      publicPath: "/assets",
    },
  };

  if (enableHmr && appOrigin) {
    devServer = {
      ...devServer,
      allowedHosts: new URL(appOrigin).hostname,
      headers: {
        "Access-Control-Allow-Origin": appOrigin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Private-Network": "true",
      },
    };
  } else if (enableHmr && appId) {
    console.warn(
      "Enabling Hot Module Replacement (HMR) with an App ID is deprecated, please see the README.md on how to update."
    );

    const appDomain = `app-${appId.toLowerCase().trim()}.canva-apps.com`;
    devServer = {
      ...devServer,
      allowedHosts: appDomain,
      headers: {
        "Access-Control-Allow-Origin": `https://${appDomain}`,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Private-Network": "true",
      },
    };
  } else {
    if (enableHmr && !appOrigin) {
      console.warn(
        "Attempted to enable Hot Module Replacement (HMR) without configuring App Origin... Disabling HMR."
      );
    }
    devServer.webSocketServer = false;
  }

  return {
    devtool: "source-map",
    devServer,
  };
}

module.exports = () => buildConfig();
module.exports.buildConfig = buildConfig;
