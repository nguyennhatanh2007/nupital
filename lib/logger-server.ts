/**
 * Server-only logging utility
 * Writes logs to file at logs/app.log
 */

import { promises as fs } from "fs";
import path from "path";

export type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  action: string;
  details?: Record<string, any>;
  error?: string;
}

const LOGS_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOGS_DIR, "app.log");
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

// Ensure logs directory exists
async function ensureLogsDir() {
  try {
    await fs.mkdir(LOGS_DIR, { recursive: true });
  } catch (e) {
    // Ignore errors
  }
}

async function rotateLogIfNeeded() {
  try {
    const stats = await fs.stat(LOG_FILE).catch(() => null);
    if (stats && stats.size > MAX_LOG_SIZE) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const archivePath = path.join(LOGS_DIR, `app-${timestamp}.log`);
      await fs.rename(LOG_FILE, archivePath);
    }
  } catch (e) {
    // Ignore rotation errors
  }
}

async function writeLog(entry: LogEntry) {
  try {
    await ensureLogsDir();
    await rotateLogIfNeeded();

    const levelEmoji: Record<LogLevel, string> = {
      info: "ℹ️",
      debug: "🔍",
      warn: "⚠️",
      error: "❌",
    };

    const emoji = levelEmoji[entry.level];
    const detailsStr = entry.details ? "\n  Details: " + JSON.stringify(entry.details, null, 2) : "";
    const errorStr = entry.error ? `\n  Error: ${entry.error}` : "";

    const logLine = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context}] ${emoji} ${entry.action}${detailsStr}${errorStr}\n`;

    await fs.appendFile(LOG_FILE, logLine, "utf-8");
  } catch (e) {
    // Fallback to console if file write fails
    console.error("[LOGGER_ERROR]", e);
  }
}

export const serverLogger = {
  info: async (context: string, action: string, details?: Record<string, any>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "info",
      context,
      action,
      details,
    };
    await writeLog(entry);
  },

  debug: async (context: string, action: string, details?: Record<string, any>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "debug",
      context,
      action,
      details,
    };
    await writeLog(entry);
  },

  warn: async (context: string, action: string, details?: Record<string, any>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "warn",
      context,
      action,
      details,
    };
    await writeLog(entry);
  },

  error: async (
    context: string,
    action: string,
    errorObj?: any,
    details?: Record<string, any>
  ) => {
    const errorMsg = errorObj instanceof Error ? errorObj.message : String(errorObj);
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "error",
      context,
      action,
      error: errorMsg,
      details,
    };
    await writeLog(entry);
    // Also print critical errors to console for visibility
    console.error(`[${context}] ❌ ${action}:`, errorMsg);
  },

  // Helper for API requests
  apiRequest: async (endpoint: string, method: string, details?: Record<string, any>) => {
    await serverLogger.info("API_REQUEST", `${method} ${endpoint}`, details);
  },

  apiResponse: async (endpoint: string, statusCode: number, duration: number) => {
    const level = statusCode >= 200 && statusCode < 300 ? "info" : "warn";
    const action = `${endpoint} - ${statusCode} (${duration}ms)`;
    if (level === "info") {
      await serverLogger.info("API_RESPONSE", action, { statusCode, duration });
    } else {
      await serverLogger.warn("API_RESPONSE", action, { statusCode, duration });
    }
  },

  apiError: async (endpoint: string, statusCode: number, error: any) => {
    await serverLogger.error("API_ERROR", `${endpoint} - ${statusCode}`, error);
  },
};
