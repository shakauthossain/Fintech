import { prisma } from "../lib/db.js";

const EMPTY = {
  google: null,
  watchFolderId: "",
  watchFolderName: "",
  processedFolderId: "",
  processedFolderName: "",
  spreadsheetId: "",
  spreadsheetName: "",
  updatedAt: null,
  updatedBy: null,
};

function rowToData(row) {
  if (!row) return { ...EMPTY };
  return {
    google: row.googleJson ?? null,
    watchFolderId: row.watchFolderId || "",
    watchFolderName: row.watchFolderName || "",
    processedFolderId: row.processedFolderId || "",
    processedFolderName: row.processedFolderName || "",
    spreadsheetId: row.spreadsheetId || "",
    spreadsheetName: row.spreadsheetName || "",
    updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt ?? null,
    updatedBy: row.updatedBy ?? null,
  };
}

class SetupStore {
  constructor() {
    this.data = { ...EMPTY };
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return this.data;
    let row = await prisma.appSetup.findUnique({ where: { id: 1 } });
    if (!row) {
      row = await prisma.appSetup.create({ data: { id: 1 } });
    }
    this.data = rowToData(row);
    this.loaded = true;
    return this.data;
  }

  async save(patch) {
    await this.load();
    this.data = { ...this.data, ...patch, updatedAt: new Date().toISOString() };

    await prisma.appSetup.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        googleJson: this.data.google,
        watchFolderId: this.data.watchFolderId,
        watchFolderName: this.data.watchFolderName,
        processedFolderId: this.data.processedFolderId,
        processedFolderName: this.data.processedFolderName,
        spreadsheetId: this.data.spreadsheetId,
        spreadsheetName: this.data.spreadsheetName,
        updatedAt: new Date(this.data.updatedAt),
        updatedBy: this.data.updatedBy,
      },
      update: {
        googleJson: this.data.google,
        watchFolderId: this.data.watchFolderId,
        watchFolderName: this.data.watchFolderName,
        processedFolderId: this.data.processedFolderId,
        processedFolderName: this.data.processedFolderName,
        spreadsheetId: this.data.spreadsheetId,
        spreadsheetName: this.data.spreadsheetName,
        updatedAt: new Date(this.data.updatedAt),
        updatedBy: this.data.updatedBy,
      },
    });

    return this.data;
  }

  async setGoogle(google) {
    return this.save({ google });
  }

  async clearGoogle() {
    return this.save({
      google: null,
      watchFolderId: "",
      watchFolderName: "",
      processedFolderId: "",
      processedFolderName: "",
      spreadsheetId: "",
      spreadsheetName: "",
    });
  }

  async setConfig(config, userId) {
    return this.save({ ...config, updatedBy: userId });
  }

  isGoogleConnected() {
    return Boolean(this.data.google?.refreshToken);
  }

  isReady() {
    return Boolean(
      this.isGoogleConnected() &&
        this.data.watchFolderId &&
        this.data.spreadsheetId
    );
  }

  toPublic() {
    const g = this.data.google;
    return {
      connected: this.isGoogleConnected(),
      ready: this.isReady(),
      googleEmail: g?.email || null,
      watchFolder: this.data.watchFolderId
        ? {
            id: this.data.watchFolderId,
            name: this.data.watchFolderName,
            url: `https://drive.google.com/drive/folders/${this.data.watchFolderId}`,
          }
        : null,
      processedFolder: this.data.processedFolderId
        ? {
            id: this.data.processedFolderId,
            name: this.data.processedFolderName,
            url: `https://drive.google.com/drive/folders/${this.data.processedFolderId}`,
          }
        : null,
      spreadsheet: this.data.spreadsheetId
        ? {
            id: this.data.spreadsheetId,
            name: this.data.spreadsheetName,
            url: `https://docs.google.com/spreadsheets/d/${this.data.spreadsheetId}`,
          }
        : null,
      updatedAt: this.data.updatedAt,
    };
  }
}

export const setupStore = new SetupStore();
export default setupStore;
