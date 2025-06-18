module.exports = {
  spec: 'test/*.{js,ts}',
  require: ['ts-node/register'],
  reporter: process.env.CI ? 'mocha-ctrf-json-reporter' : 'spec'
}
