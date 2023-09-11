const { composePlugins, withNx, withWeb } = require('@nx/rspack')

module.exports = composePlugins(withNx(), withWeb(), (config) => {
  return { ...config, devServer: { ...config.devServer, historyApiFallback: true } }
})
