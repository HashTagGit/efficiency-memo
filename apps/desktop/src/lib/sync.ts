import { invoke } from "@tauri-apps/api/core";

export async function storeWebdavCredentials(
  username: string,
  password: string,
): Promise<void> {
  return invoke("store_webdav_credentials", { username, password });
}

export async function syncExport(url: string, username: string): Promise<string> {
  return invoke("sync_export", { url, username });
}

export async function syncImport(url: string, username: string): Promise<string> {
  return invoke("sync_import", { url, username });
}

export async function syncList(url: string, username: string): Promise<string[]> {
  return invoke("sync_list", { url, username });
}
