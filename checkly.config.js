


const config = {
  projectName: 'Website Monitoring',
  logicalId: 'website-monitoring-1',
  repoUrl: 'https://github.com/acme/website',
  checks: {
    activated: true,
    muted: false,
    runtimeId: '2022.10',
    frequency: Frequency.EVERY_5M,
    locations: ['us-east-1', 'eu-west-1'],
    tags: ['website', 'api'],
    checkMatch: '**/__checks__/**/*.check.js',
    ignoreDirectoriesMatch: [],
    browserChecks: {
      frequency: Frequency.EVERY_10M,
      testMatch: '**/__checks__/**/*.spec.js',
    },
  },
  cli: {
    runLocation: 'eu-west-1',
  }
 }
 
 module.exports = config;
 