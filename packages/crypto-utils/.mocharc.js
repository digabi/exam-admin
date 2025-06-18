module.exports = {
  require: ['ts-node/register'],
  reporter: process.env.CI ? 'mocha-ctrf-json-reporter' : 'spec',
  spec: 'test/**/*.ts'
}
