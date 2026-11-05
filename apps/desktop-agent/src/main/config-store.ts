import fs from "fs";
import path from "path";
import os from "os";
import { logger } from "./logger";

export interface AgentConfig {
  backendUrl: string;
  deviceId: string;
  deviceToken: string;
  vendorName: string;
  vendorSlug: string;
  isPollingActive: boolean;
  defaultBwPrinter?: string;
  defaultColorPrinter?: string;
  userEmail?: string;
  sessionToken?: string;
  deviceName?: string;
}

interface StoredConfigPayload {
  backendUrl: string;
  deviceId: string;
  encryptedDeviceToken?: string;
  deviceToken?: string;
  vendorName: string;
  vendorSlug: string;
  isPollingActive: boolean;
  defaultBwPrinter?: string;
  defaultColorPrinter?: string;
  userEmail?: string;
  encryptedSessionToken?: string;
  sessionToken?: string;
  deviceName?: string;
}

export class ConfigStore {
  private configFilePath: string;
  private inMemoryConfig: AgentConfig | null = null;

  constructor(customPath?: string) {
    this.configFilePath = customPath || this.resolveConfigPath();
    this.loadConfig();
  }

  private resolveConfigPath(): string {
    try {
      const { app } = require("electron");
      if (app && typeof app.getPath === "function") {
        return path.join(app.getPath("userData"), "agent-config.json");
      }
    } catch {
      // Not in Electron
    }

    const appData =
      process.env.APPDATA ||
      (process.platform === "darwin"
        ? path.join(os.homedir(), "Library", "Application Support")
        : path.join(os.homedir(), ".config"));
    return path.join(appData, "Print2Me Desktop Agent", "agent-config.json");
  }

  private getSafeStorage(): any {
    try {
      const { safeStorage } = require("electron");
      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        return safeStorage;
      }
    } catch {
      // Safe storage not available
    }
    return null;
  }

  private encryptSecret(plaintext?: string): { encrypted?: string; plain?: string } {
    if (!plaintext) return {};
    const safeStorage = this.getSafeStorage();
    if (safeStorage) {
      try {
        const buffer = safeStorage.encryptString(plaintext);
        return { encrypted: buffer.toString("base64") };
      } catch (err) {
        logger.warn("safeStorage encryption failed, falling back to restricted file storage");
      }
    }
    return { plain: plaintext };
  }

  private decryptSecret(encryptedBase64?: string, plainFallback?: string): string {
    if (encryptedBase64) {
      const safeStorage = this.getSafeStorage();
      if (safeStorage) {
        try {
          const buffer = Buffer.from(encryptedBase64, "base64");
          return safeStorage.decryptString(buffer);
        } catch (err) {
          logger.error("Failed to decrypt stored credentials via safeStorage");
        }
      }
    }
    return plainFallback || "";
  }

  public getConfig(): AgentConfig | null {
    return this.inMemoryConfig;
  }

  public saveConfig(config: AgentConfig): void {
    this.inMemoryConfig = { ...config };
    try {
      const dir = path.dirname(this.configFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const deviceTokenEnc = this.encryptSecret(config.deviceToken);
      const sessionTokenEnc = this.encryptSecret(config.sessionToken);

      const stored: StoredConfigPayload = {
        backendUrl: config.backendUrl,
        deviceId: config.deviceId,
        vendorName: config.vendorName,
        vendorSlug: config.vendorSlug,
        isPollingActive: config.isPollingActive,
        defaultBwPrinter: config.defaultBwPrinter,
        defaultColorPrinter: config.defaultColorPrinter,
        userEmail: config.userEmail,
        deviceName: config.deviceName,
        encryptedDeviceToken: deviceTokenEnc.encrypted,
        deviceToken: deviceTokenEnc.plain,
        encryptedSessionToken: sessionTokenEnc.encrypted,
        sessionToken: sessionTokenEnc.plain,
      };

      const tmpFile = `${this.configFilePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(stored, null, 2), {
        encoding: "utf-8",
        mode: 0o600,
      });
      fs.renameSync(tmpFile, this.configFilePath);

      logger.info(`Agent configuration safely saved for vendor '${config.vendorName}'`);
    } catch (err: any) {
      logger.error(`Failed to save configuration: ${err.message}`);
    }
  }

  public clearConfig(): void {
    this.inMemoryConfig = null;
    try {
      if (fs.existsSync(this.configFilePath)) {
        fs.unlinkSync(this.configFilePath);
      }
      logger.info("Agent credentials purged from local disk");
    } catch (err: any) {
      logger.error(`Failed to delete configuration file: ${err.message}`);
    }
  }

  private loadConfig(): void {
    if (!fs.existsSync(this.configFilePath)) {
      // Check legacy config file path in homedir for backward compatibility migration
      const legacyPath = path.join(os.homedir(), ".printflow-agent-config.json");
      if (fs.existsSync(legacyPath)) {
        try {
          const raw = fs.readFileSync(legacyPath, "utf-8");
          const legacy = JSON.parse(raw);
          if (legacy && legacy.deviceId) {
            this.saveConfig(legacy);
            try { fs.unlinkSync(legacyPath); } catch {}
            return;
          }
        } catch {
          // ignore legacy failure
        }
      }
      this.inMemoryConfig = null;
      return;
    }

    try {
      const raw = fs.readFileSync(this.configFilePath, "utf-8");
      const stored: StoredConfigPayload = JSON.parse(raw);

      const deviceToken = this.decryptSecret(
        stored.encryptedDeviceToken,
        stored.deviceToken
      );
      const sessionToken = this.decryptSecret(
        stored.encryptedSessionToken,
        stored.sessionToken
      );

      this.inMemoryConfig = {
        backendUrl: stored.backendUrl,
        deviceId: stored.deviceId,
        deviceToken,
        vendorName: stored.vendorName,
        vendorSlug: stored.vendorSlug,
        isPollingActive: Boolean(stored.isPollingActive),
        defaultBwPrinter: stored.defaultBwPrinter,
        defaultColorPrinter: stored.defaultColorPrinter,
        userEmail: stored.userEmail,
        sessionToken: sessionToken || undefined,
        deviceName: stored.deviceName,
      };
      logger.info(`Loaded workstation credentials for ${stored.vendorName}`);
    } catch (err: any) {
      logger.error(`Failed to parse config file: ${err.message}`);
      this.inMemoryConfig = null;
    }
  }
}

export const configStore = new ConfigStore();

