const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');
      // Add use_modular_headers! after the first "platform" line
      if (!contents.includes('use_modular_headers!')) {
        contents = contents.replace(
          /(platform :ios.*\n)/,
          `$1use_modular_headers!\n`
        );
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);
};
