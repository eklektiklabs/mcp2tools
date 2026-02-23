import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';

const DEFAULT_TTL = 3600000;
const CACHE_DIR_NAME = '.mcp-to-tools/cache';

export const getCachePath = () => {
  const home = homedir();
  return resolve(join(home, CACHE_DIR_NAME));
};

export const getCacheKey = (key) => {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${safe}.json`;
};

const ensureCacheDir = () => {
  const cachePath = getCachePath();
  if (!existsSync(cachePath)) {
    mkdirSync(cachePath, { recursive: true });
  }
  return cachePath;
};

export const getCachedTools = (key) => {
  const cachePath = getCachePath();
  const cacheFile = join(cachePath, getCacheKey(key));

  if (!existsSync(cacheFile)) {
    return null;
  }

  try {
    const content = readFileSync(cacheFile, 'utf-8');
    const { tools, timestamp, ttl } = JSON.parse(content);
    const expiresAt = timestamp + ttl;

    if (Date.now() > expiresAt) {
      return null;
    }

    return tools;
  } catch (err) {
    return null;
  }
};

export const setCachedTools = (key, tools, ttl = DEFAULT_TTL) => {
  const cachePath = ensureCacheDir();
  const cacheFile = join(cachePath, getCacheKey(key));

  const cacheData = {
    tools,
    timestamp: Date.now(),
    ttl
  };

  writeFileSync(cacheFile, JSON.stringify(cacheData), 'utf-8');
};

export { DEFAULT_TTL };
