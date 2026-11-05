import fs from "fs";
import path from "path";
import os from "os";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

export type LogListener = (entry: LogEntry) => void;

export class Logger {
  private logDir: string;
  private currentLogFile: string;
  private maxFileSize = 5 * 1024 * 1024; // 5 MB
  private maxBackups = 5;
  private listeners: LogListener[] = [];
  private writeQueue: string[] = [];
  private isWriting = false;

  constructor(customLogDir?: string) {
    this.logDir = customLogDir || this.resolveLogDirectory();
    this.currentLogFile = path.join(this.logDir, "print2me-agent.log");
    this.ensureDirectory();
  }

  private resolveLogDirectory(): string {
    if (process.env.PRINT2ME_LOG_DIR) {
      return process.env.PRINT2ME_LOG_DIR;
    }

    try {
      const { app } = require("electron");
      if (app && typeof app.getPath === "function") {
        return path.join(app.getPath("userData"), "logs");
      }
    } catch {
      // Fallback for tests / CLI
    }

    const appData = process.env.APPDATA;
    if (appData) {
      const target = path.join(appData, "Print2Me Desktop Agent", "logs");
      try {
        fs.mkdirSync(target, { recursive: true });
        return target;
      } catch {
        // Fallback to tmpdir if AppData is not writable
      }
    }

    return path.join(os.tmpdir(), "print2me-workstation-logs");
  }

  private ensureDirectory() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (err) {
      // If primary directory fails, fallback to temp dir
      try {
        this.logDir = path.join(os.tmpdir(), "print2me-workstation-logs");
        this.currentLogFile = path.join(this.logDir, "print2me-agent.log");
        if (!fs.existsSync(this.logDir)) {
          fs.mkdirSync(this.logDir, { recursive: true });
        }
      } catch {}
    }
  }

  public addListener(listener: LogListener) {
    this.listeners.push(listener);
  }

  public removeListener(listener: LogListener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  /**
   * Sanitizes sensitive fields like tokens, passwords, cookies, and secret URLs
   */
  public sanitize(text: string): string {
    if (!text || typeof text !== "string") return text;
    return text
      .replace(/(Bearer\s+)[A-Za-z0-9-_.]+/gi, "$1[REDACTED_TOKEN]")
      .replace(/(password["':\s=]+)[^\s"',&]+/gi, "$1[REDACTED]")
      .replace(/(sessionToken["':\s=]+)[^\s"',&]+/gi, "$1[REDACTED]")
      .replace(/(deviceToken["':\s=]+)[^\s"',&]+/gi, "$1[REDACTED]")
      .replace(/(x-device-token["':\s=]+)[^\s"',&]+/gi, "$1[REDACTED]")
      .replace(/(printflow_session=)[^;\s&]+/gi, "$1[REDACTED]")
      .replace(/(sig=[A-Za-z0-9%_-]+)/gi, "sig=[REDACTED_SAS_SIG]");
  }

  private write(
    level: LogLevel,
    message: string,
    correlationId?: string,
    metadata?: Record<string, any>
  ) {
    const timestamp = new Date().toISOString();
    const cleanMessage = this.sanitize(message);
    const cleanMeta = metadata ? JSON.parse(this.sanitize(JSON.stringify(metadata))) : undefined;

    const entry: LogEntry = {
      timestamp,
      level,
      message: cleanMessage,
      correlationId,
      metadata: cleanMeta,
    };

    // Format for console
    const prefix = `[${timestamp}] [${level}]${correlationId ? ` [${correlationId}]` : ""}:`;
    if (level === "ERROR" || level === "FATAL") {
      console.error(prefix, cleanMessage, cleanMeta || "");
    } else if (level === "WARN") {
      console.warn(prefix, cleanMessage, cleanMeta || "");
    } else {
      console.log(prefix, cleanMessage, cleanMeta || "");
    }

    // Format for file: JSON line
    const logLine = JSON.stringify(entry) + "\n";
    this.queueFileWrite(logLine);

    // Notify listeners (UI)
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch {
        // Listener error ignored
      }
    }
  }

  private queueFileWrite(line: string) {
    this.writeQueue.push(line);
    if (!this.isWriting) {
      this.flushQueue();
    }
  }

  private async flushQueue() {
    if (this.writeQueue.length === 0) {
      this.isWriting = false;
      return;
    }
    this.isWriting = true;
    const chunk = this.writeQueue.join("");
    this.writeQueue = [];

    try {
      this.ensureDirectory();
      this.rotateIfNeeded();
      await fs.promises.appendFile(this.currentLogFile, chunk, "utf-8");
    } catch (err) {
      // Non-fatal if filesystem write temporarily fails
    } finally {
      if (this.writeQueue.length > 0) {
        setImmediate(() => this.flushQueue());
      } else {
        this.isWriting = false;
      }
    }
  }

  private rotateIfNeeded() {
    try {
      if (!fs.existsSync(this.currentLogFile)) return;
      const stat = fs.statSync(this.currentLogFile);
      if (stat.size >= this.maxFileSize) {
        for (let i = this.maxBackups - 1; i >= 1; i--) {
          const src = `${this.currentLogFile}.${i}`;
          const dest = `${this.currentLogFile}.${i + 1}`;
          if (fs.existsSync(src)) {
            if (i === this.maxBackups - 1) {
              try { fs.unlinkSync(src); } catch {}
            } else {
              try { fs.renameSync(src, dest); } catch {}
            }
          }
        }
        try {
          fs.renameSync(this.currentLogFile, `${this.currentLogFile}.1`);
        } catch {}
      }
    } catch {}
  }

  public debug(message: string, correlationId?: string, metadata?: Record<string, any>) {
    this.write("DEBUG", message, correlationId, metadata);
  }

  public info(message: string, correlationId?: string, metadata?: Record<string, any>) {
    this.write("INFO", message, correlationId, metadata);
  }

  public warn(message: string, correlationId?: string, metadata?: Record<string, any>) {
    this.write("WARN", message, correlationId, metadata);
  }

  public error(message: string, correlationId?: string, metadata?: Record<string, any>) {
    this.write("ERROR", message, correlationId, metadata);
  }

  public fatal(message: string, correlationId?: string, metadata?: Record<string, any>) {
    this.write("FATAL", message, correlationId, metadata);
  }

  public getLogDirectory(): string {
    return this.logDir;
  }

  public getCurrentLogPath(): string {
    return this.currentLogFile;
  }

  public getRecentLogs(maxCount = 200): LogEntry[] {
    try {
      if (!fs.existsSync(this.currentLogFile)) return [];
      const content = fs.readFileSync(this.currentLogFile, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);
      const recent = lines.slice(-maxCount);
      const entries: LogEntry[] = [];
      for (const line of recent) {
        try {
          entries.push(JSON.parse(line));
        } catch {}
      }
      return entries;
    } catch {
      return [];
    }
  }
}

export const logger = new Logger();
