import config from "../config/env.js";
import setupStore from "../store/setupStore.js";

export async function getEffectiveGoogleConfig() {
  await setupStore.load();

  // OAuth connected — use tokens even before folders/sheet are chosen (setup wizard).
  if (setupStore.isGoogleConnected()) {
    return {
      source: "oauth",
      watchFolderId: setupStore.data.watchFolderId || "",
      processedFolderId: setupStore.data.processedFolderId || "",
      spreadsheetId: setupStore.data.spreadsheetId || "",
    };
  }

  if (
    config.google.credentialsPath &&
    config.google.watchFolderId &&
    config.google.spreadsheetId
  ) {
    return {
      source: "service_account",
      credentialsPath: config.google.credentialsPath,
      watchFolderId: config.google.watchFolderId,
      processedFolderId: config.google.processedFolderId || "",
      spreadsheetId: config.google.spreadsheetId,
    };
  }

  return null;
}

export async function hasGoogleIntegration() {
  const cfg = await getEffectiveGoogleConfig();
  return Boolean(cfg?.watchFolderId && cfg?.spreadsheetId);
}

export async function getRuntimeCapabilities() {
  const google = await hasGoogleIntegration();
  const hasOpenRouter = Boolean(config.openrouter.apiKey);

  await setupStore.load();

  return {
    hasGoogle: google,
    hasOpenRouter,
    canProcess: hasOpenRouter,
    mockMode: !hasOpenRouter,
    setup: setupStore.toPublic(),
    oauthConfigured: Boolean(config.googleOAuth.clientId && config.googleOAuth.clientSecret),
  };
}

export default getRuntimeCapabilities;
