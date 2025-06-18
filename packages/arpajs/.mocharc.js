module.exports = {
  require: ['ts-node/register', 'test/config.js'],
  timeout: 5000,
  exit: true,
  spec: ['test/**/*.js', 'test/**/*.ts'],
  reporter: process.env.CI ? 'mocha-ctrf-json-reporter' : 'spec'
}
