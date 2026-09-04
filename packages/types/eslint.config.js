const { base } = require('@ptg/eslint-config');

module.exports = [...base, { ignores: ['dist/**'] }];
