module.exports = {
  require: ['ts-node/register'],
  reporter: process.env.CI ? 'mocha-ctrf-json-reporter' : 'spec',
  exit: true,
  spec: ['test/**/*.js', 'test/**/*.ts']
}
