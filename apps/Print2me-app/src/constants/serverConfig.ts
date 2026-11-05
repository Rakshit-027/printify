import serverConfig from '../../server.config.json';

/**
 * Normalizes user-provided server URLs into standard http(s)://host:port format.
 * Handles inputs like:
 * - "10.63.231.201" -> "http://10.63.231.201:8080"
 * - "192.168.1.5:8080" -> "http://192.168.1.5:8080"
 * - "https://api.print2me.in" -> "https://api.print2me.in"
 * - "http://localhost:8080/" -> "http://localhost:8080"
 */
export function normalizeServerUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return 'https://api.print2me.in';
  }

  let url = rawUrl.trim();

  // If missing protocol scheme, prepend http://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }

  // If no port specified and it's plain http, default to :8080
  const afterScheme = url.replace(/^https?:\/\//, '');
  if (!afterScheme.includes(':') && !url.startsWith('https://')) {
    url = `${url}:8080`;
  }

  // Remove trailing slashes
  return url.replace(/\/+$/, '');
}

export const DEFAULT_SERVER_URL = normalizeServerUrl(serverConfig?.serverUrl);

export { serverConfig };
export default serverConfig;
