require("dotenv").config();
const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const { DefinePlugin } = require("webpack");
const chalk = require("chalk");
const { transform } = require("@formatjs/ts-transformer");
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

function buildDevConfig(devConfig) {
  if (!devConfig) {
    return {};
  }
  return {
    devtool: 'source-map',
    devServer: {
      hot: true,
      port: parseInt(process.env.CANVA_FRONTEND_PORT || '8080', 10),
    }
  };
}

function buildConfig({
  devConfig,
  appEntry = path.join(__dirname, "src", "index.tsx"),
  backendHost = process.env.CANVA_BACKEND_HOST || 'http://localhost:8080',
} = {}) {
  const mode = devConfig ? "development" : "production";
  const isProduction = mode === "production";

  if (!process.env.CANVA_FRONTEND_PORT) {
    console.warn(
      chalk.yellowBright.bold(
        "Warning: CANVA_FRONTEND_PORT is not defined. Using default port 8080."
      )
    );
  }

  if (backendHost.includes("localhost") && isProduction) {
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
      extensions: [".ts", ".tsx", ".js", ".jsx", ".css", ".svg", ".woff", ".woff2"],
    },
    infrastructureLogging: {
      level: "none",
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
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
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : "style-loader",
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
          test: /\.(png|jpg|jpeg|gif)$/i,
          type: "asset",
          parser: {
            dataUrlCondition: {
              maxSize: 8 * 1024 // 8kb
            }
          }
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: "asset/resource",
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
              type: "asset",
              parser: {
                dataUrlCondition: {
                  maxSize: 4 * 1024 // 4kb
                }
              }
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
            compress: {
              drop_console: isProduction,
              drop_debugger: isProduction,
            },
          },
        }),
      ],
      splitChunks: {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        minChunks: 1,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        automaticNameDelimiter: '~',
        enforceSizeThreshold: 50000,
        cacheGroups: {
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10
          },
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true
          }
        }
      },
    },
    output: {
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      path: path.resolve(__dirname, "dist"),
      clean: true,
    },
    plugins: [
      new DefinePlugin({
        BACKEND_HOST: JSON.stringify(backendHost),
        'process.env.NODE_ENV': JSON.stringify(mode),
        'CANVA_FRONTEND_PORT': JSON.stringify(process.env.CANVA_FRONTEND_PORT || '8080')
      }),
      new MiniCssExtractPlugin({
        filename: isProduction ? '[name].[contenthash].css' : '[name].css',
      }),
      ...(isProduction ? [
        new CompressionPlugin(),
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      ] : []),
    ],
    ...buildDevConfig(devConfig),
  };
}

module.exports = () => buildConfig();
module.exports.buildConfig = buildConfig;
