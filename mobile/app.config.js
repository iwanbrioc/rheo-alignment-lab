const { validateBuildEnvironment } = require('./build-config.cjs');

module.exports = ({ config }) => {
  const { privateBeta } = validateBuildEnvironment(process.env);
  return {
    ...config,
    scheme: 'rheo',
    ios: { ...config.ios, infoPlist: { ...config.ios?.infoPlist,
      ...(privateBeta ? { NSAppTransportSecurity: { NSAllowsArbitraryLoads: false, NSAllowsLocalNetworking: false } } : {}),
    } },
    android: { ...config.android, allowBackup: false,
      blockedPermissions: ['android.permission.ACCESS_BACKGROUND_LOCATION', 'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.USE_FINGERPRINT', 'android.permission.USE_BIOMETRIC',
        ...(privateBeta ? ['android.permission.SYSTEM_ALERT_WINDOW'] : [])],
    },
  };
};
