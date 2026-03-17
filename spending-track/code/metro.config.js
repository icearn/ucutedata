const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Ensure resolver and assetExts exist
if (!config.resolver) config.resolver = {};
if (!config.resolver.assetExts) config.resolver.assetExts = [];
config.resolver.assetExts.push("wasm");

try {
  const { withNativeWind } = require("nativewind/metro");
  module.exports = withNativeWind(config, { input: "./src/styles/global.css" });
} catch (e) {
  console.warn("NativeWind not loaded in Metro config:", e);
  module.exports = config;
}
