const path = require('path')
const webpack = require('webpack')

const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')

const jsSource = p => ['@babel/polyfill', path.resolve(__dirname, 'public/js', p)]

module.exports = function (env, argv) {
  const isProduction = argv && argv['mode'] === 'production'

  const plugins = [
    new webpack.ProvidePlugin({
      $: 'jquery'
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css'
    })
  ]

  if (isProduction) {
    plugins.push(new CssMinimizerPlugin())
  }

  return {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'cheap-module-source-map',
    entry: {
      'user-data': jsSource('user-data.js'),
      'return-exams-main': jsSource('return-exams-main.js'),
      'bertta-main': jsSource('bertta-main.js'),
      preview: jsSource('preview.js'),
      answers: jsSource('answers/answers-main.tsx'),
      'print-results': jsSource('answers/print-results.tsx'),
      index: jsSource('index.js'),
      'oauth-consent': jsSource('oauth-consent.js'),
      'oauth-login': jsSource('oauth-login.js'),
      'editor.worker': 'monaco-editor/esm/vs/editor/editor.worker.js',
      'json.worker': 'monaco-editor/esm/vs/language/json/json.worker',
      'css.worker': 'monaco-editor/esm/vs/language/css/css.worker',
      'html.worker': 'monaco-editor/esm/vs/language/html/html.worker',
      'ts.worker': 'monaco-editor/esm/vs/language/typescript/ts.worker',
      admin: jsSource('admin.js'),
      'grading-exams': jsSource('grading/grading-exams.js'),
      grading: jsSource('grading/grading-main.js')
    },
    output: {
      globalObject: 'self',
      path: `${__dirname}/public/dist`,
      filename: '[name]-bundle.js',
      publicPath: '/dist/',
      assetModuleFilename: '[name][ext]'
    },
    plugins,
    resolve: {
      alias: {
        'sanitize-html': 'sanitize-html/index.js',

        // Make sure only one instance of react is bundled
        react: require.resolve('react')
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
    },
    module: {
      rules: [
        // Handlebars templates
        {
          test: /\.hbs$/,
          use: {
            loader: 'handlebars-loader',
            options: {
              knownHelpers: ['t', 'inc', 'json'],
              inlineRequires: '/img/',
              partialDirs: path.resolve(__dirname, 'public/templates/partials')
            }
          }
        },
        // TS/JS/JSON
        {
          test: /\.(js|jsx|ts|tsx|json)$/,
          exclude: [
            path.resolve(__dirname, 'node_modules'),
            path.resolve(__dirname, 'node_modules/@digabi/exam-engine-core')
          ],
          include: [
            __dirname,
            path.resolve(__dirname, 'node_modules/@digabi'),
            path.resolve(__dirname, 'node_modules/rich-text-editor'),
            path.resolve(__dirname, 'node_modules/monaco-editor')
          ],
          use: {
            loader: 'ts-loader',
            options: {
              onlyCompileBundledFiles: true,
              transpileOnly: true
            }
          }
        },
        // CSS modules
        {
          test: /\.css$/,
          include: path.resolve(__dirname, 'public/js'),
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
                modules: {
                  localIdentName: '[name]__[local]___[hash:base64:5]'
                }
              }
            },
            'postcss-loader'
          ]
        },
        // Normal CSS files
        {
          test: /\.css$/,
          exclude: path.resolve(__dirname, 'public/js'),
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: { importLoaders: 1 }
            },
            'postcss-loader'
          ]
        },
        // Normal LESS files
        {
          test: /\.less$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: { importLoaders: 2 }
            },
            'postcss-loader',
            {
              loader: 'less-loader',
              options: {
                lessOptions: {
                  plugins: [],
                  paths: require.resolve.paths('')
                }
              }
            }
          ]
        },
        // Static assets
        {
          test: /\.(woff|woff2|otf|ttf|eot|svg|png|gif|jpg)$/,
          type: 'asset/resource'
        }
      ]
    },
    stats: {
      children: false,
      entrypoints: true,
      modules: false
    },
    performance: {
      hints: false
    }
  }
}
