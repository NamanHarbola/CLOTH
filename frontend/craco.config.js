const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src/'),
    }
  },
  // This part tells craco to use your existing postcss.config.js
  style: {
    postcss: {
      mode: 'file',
    },
  },
};