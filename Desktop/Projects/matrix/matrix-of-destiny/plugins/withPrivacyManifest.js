/**
 * Expo config plugin: copies ios/PrivacyInfo.xcprivacy into the Xcode project
 * and adds it to the main target's resources so Apple's validation tool sees it.
 *
 * Required since May 1 2024 for any app using "required reason APIs".
 */
const { withXcodeProject, IOSConfig } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

module.exports = function withPrivacyManifest(config) {
  return withXcodeProject(config, (cfg) => {
    const proj = cfg.modResults;
    const projectRoot = cfg.modRequest.projectRoot;
    const platformRoot = cfg.modRequest.platformProjectRoot; // ios/

    const srcFile = path.join(projectRoot, 'ios', 'PrivacyInfo.xcprivacy');
    const destFile = path.join(platformRoot, 'PrivacyInfo.xcprivacy');

    // Copy the file if it doesn't already exist in ios/
    if (!fs.existsSync(destFile) && fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destFile);
    }

    // Add to Xcode project if not already added
    const targetName = IOSConfig.XcodeUtils.getProjectName(cfg);
    const groupName = targetName;

    const alreadyAdded = proj
      .pbxFileReferenceSection()
      .find(([, ref]) => ref.path === '"PrivacyInfo.xcprivacy"');

    if (!alreadyAdded) {
      proj.addResourceFile('PrivacyInfo.xcprivacy', { target: proj.getFirstTarget().uuid }, groupName);
    }

    return cfg;
  });
};
