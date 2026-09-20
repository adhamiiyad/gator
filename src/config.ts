import fs from "fs";
import os from "os";
import path from "path";

export type Config = {
  dbUrl: string;
  currentUserName?: string;
};

const CONFIG_FILE_NAME = ".gatorconfig.json";

function getConfigFilePath(): string {
  return path.join(os.homedir(), CONFIG_FILE_NAME);
}

function validateConfig(rawConfig: any): Config {
  if (typeof rawConfig !== "object" || rawConfig === null) {
    throw new Error("Invalid config file format");
  }

  if (typeof rawConfig.db_url !== "string") {
    throw new Error("Missing or invalid db_url in config");
  }

  const config: Config = {
    dbUrl: rawConfig.db_url,
  };

  if (typeof rawConfig.current_user_name === "string") {
    config.currentUserName = rawConfig.current_user_name;
  }

  return config;
}

function writeConfig(cfg: Config): void {
  const filePath = getConfigFilePath();
  const rawConfig: Record<string, any> = {
    db_url: cfg.dbUrl,
  };

  if (cfg.currentUserName !== undefined) {
    rawConfig.current_user_name = cfg.currentUserName;
  }

  fs.writeFileSync(filePath, JSON.stringify(rawConfig, null, 2), "utf-8");
}

export function readConfig(): Config {
  const filePath = getConfigFilePath();
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const rawConfig = JSON.parse(fileContent);

  return validateConfig(rawConfig);
}

export function setUser(username: string): void {
  const cfg = readConfig();
  cfg.currentUserName = username;
  writeConfig(cfg);
}