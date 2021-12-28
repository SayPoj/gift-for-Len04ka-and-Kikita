const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const {CleanWebpackPlugin} = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const TerserWebpackPlugin = require('terser-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCssAssetsWebpackPlugin = require('optimize-css-assets-webpack-plugin')
require("babel-polyfill");
const fs = require("fs");


const isDev = process.env.NODE_ENV === 'development'
const filename = ext => isDev ? `[name].${ext}` : `[name][contenthash].${ext}`
const cssLoaders = extra => {
    const loaders = [
        {
            loader: MiniCssExtractPlugin.loader,
            options: {},
        },
        'css-loader',
    ]
    if (extra) {loaders.push(extra)}
    return loaders
}
const babelOptions = extra => {
    const options = {
        presets: ['@babel/preset-env'],
        plugins: ['transform-regenerator']
    }
    if (extra) {options.presets.push(extra)}
    return options
}

console.log('IS DEV: ', isDev)

function optimization() {
    const config = {
        splitChunks: {chunks: "all"},

    }
    if (!isDev) {
        config.minimizer = [
            new TerserWebpackPlugin({
                terserOptions: {
                    format: {
                        comments: false,
                    },
                },
                extractComments: false,
            }),
            new OptimizeCssAssetsWebpackPlugin()
        ]
    }
    return config
}

module.exports = {
    context: path.resolve(__dirname, 'src'),
    mode: "development",
    entry: {
        main: ['@babel/polyfill', './index.js']
    },
    output: {
        filename: filename('js'),
        path: path.join(__dirname, 'dist/'+ require("./package.json").name),
        publicPath: "/",
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            nodeModules: path.resolve(__dirname, 'node_modules/')
        }
    },
    devServer: {
        host: '0.0.0.0',
        disableHostCheck: true,
        port: 4200,
        historyApiFallback:{
            index:'/index.html'
        },
    },
    target: 'web',
    devtool: isDev?'source-map':false,
    optimization: optimization(),
    plugins: [
        new HtmlWebpackPlugin({
            template: "./index.html",
            minify: {
                collapseWhitespace: !isDev
            }
        }),
        new CleanWebpackPlugin(),
    fs.existsSync(path.resolve(__dirname, 'src/assets')) ? new CopyWebpackPlugin({
            patterns: [{
                from: path.resolve(__dirname, 'src/assets'),
                to: path.resolve(__dirname, 'dist/'+ require("./package.json").name + '/assets')
            }]
        }):()=>{},
        new MiniCssExtractPlugin({
            filename: filename('css')
        }),
    ],
    module: {
        rules: [
            {
                test: /\.m?js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: babelOptions()
                }
            },
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: babelOptions('@babel/preset-typescript')
                }
            },
            {
                test: /\.css$/,
                use: cssLoaders()
            },
            {
                test: /\.s[ac]ss$/,
                use: cssLoaders('sass-loader')
            },
            {
                test: /\.(png|jpg|svg|gif|ttf|mp3|wav|pdf)$/,
                use: [
                    'file-loader'
                ]
            }
        ]
    }
}
