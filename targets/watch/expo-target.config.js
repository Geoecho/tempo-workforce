/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: "watch",
  icon: '../../assets/tempo-icon.png',
  colors: { $accent: '#D5E2CB' },
  deploymentTarget: '11.0',
});
