// Runs the unit tests in headless Chrome with software WebGL enabled, so the specs that draw
// the 3D scene and read pixels back actually run (plain ChromeHeadless has no WebGL2 and those
// specs skip themselves). Use `pnpm test:webgl`.
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [require('karma-jasmine'), require('karma-chrome-launcher')],
    client: { clearContext: false },
    reporters: ['progress'],
    browsers: ['ChromeHeadlessWebGL'],
    customLaunchers: {
      ChromeHeadlessWebGL: {
        base: 'ChromeHeadless',
        flags: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
      },
    },
  });
};
