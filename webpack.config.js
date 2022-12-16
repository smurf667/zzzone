const path = require('path');
const webpack = require('webpack')

const entry = process.env.EDITOR === 'y' ? './src/editor.js' :
  (process.env.NODE_ENV === 'production' ? './src/index.js' : './src/index-dev.js');

module.exports = {
  entry,
  mode: process.env.NODE_ENV || 'development',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [ new webpack.EnvironmentPlugin({ NODE_ENV: 'development'}) ]
};

console.log("***");
console.log("*** building", module.exports.mode);
console.log("*** entry   ", module.exports.entry);
console.log("***");
console.log("");
