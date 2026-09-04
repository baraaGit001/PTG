const { react } = require('@ptg/eslint-config');

module.exports = [...react, { ignores: ['dist/**'] }];
