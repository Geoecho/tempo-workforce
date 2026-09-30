/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: "watch",
  icon: '../../assets/tempo-icon.png',
  colors: { $accent: '#B7EDBE' },
  deploymentTarget: '11.0',
});
