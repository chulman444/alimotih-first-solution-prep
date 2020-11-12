const path = require("path")
const CopyPlugin = require('copy-webpack-plugin');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');

module.exports = function() {
  return {
    entry: {
      popup: "./src/popup.tsx",
      contentScript: "./src/contentScript.ts",
      background: "./src/background.ts"
    },
    output: {
      filename: "[name].js",
      path: path.resolve(__dirname, "dist")
    },
    /**
     * https://webpack.js.org/guides/development/
     * 
     * Browser will print out a stack properly.
     */
    devtool: 'inline-source-map',
    resolve: {
      /**
       * ".js" and ".jsx" resolve:
       * 
       * ```
       * Module not found: Error: Can't resolve 'object-assign'
       * ```
       * 
       * error.
       */
      extensions: [".ts", ".tsx", ".js", ".jsx"]
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules|\.d\.ts$/
        }
      ]
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: "public/**/*", to: "./", flatten: true },
          { from: "src/*.css", to: "./", flatten: true },
          { from: "manifest.json" }
        ]
      }),
      new ProgressBarPlugin()
    ],
  }
}