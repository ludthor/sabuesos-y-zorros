/**
 * Dirección que se comparte en el QR de las salas: PUBLIC_URL si se da, si no
 * la primera de la red local. Se reduce siempre a su origen (sin ruta ni barra final).
 */
export function resolveShareOrigin(publicUrl: string | undefined, lanOrigins: string[]): string | null {
  if (publicUrl) {
    let url: URL;
    try {
      url = new URL(publicUrl);
    } catch {
      throw new Error(`PUBLIC_URL no es una dirección válida: ${publicUrl}`);
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error(`PUBLIC_URL debe empezar por http:// o https://: ${publicUrl}`);
    }
    return url.origin;
  }
  return lanOrigins[0] ?? null;
}
