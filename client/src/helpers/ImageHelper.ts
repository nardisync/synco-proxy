import { API_BASE } from "../constants";

const DPI = 300;
const IN = (inches: number) => Math.round(inches * DPI);

export function toProxied(url: string) {
  if (!url) return url;
  if (url.startsWith("data:")) return url;
  const prefix = `${API_BASE}/api/cards/images/proxy?url=`;
  if (url.startsWith(prefix)) return url;
  return `${prefix}${encodeURIComponent(url)}`;
}

export function getBleedInPixels(bleedEdgeWidth: number, unit: string): number {
  return unit === "mm" ? IN(bleedEdgeWidth / 25.4) : IN(bleedEdgeWidth);
}

export function getLocalBleedImageUrl(originalUrl: string): string {
  return toProxied(originalUrl);
}

export async function urlToDataUrl(url: string): Promise<string> {
  const resp = await fetch(toProxied(url));
  if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
  const blob = await resp.blob();
  return URL.createObjectURL(blob);
}

export function pngToNormal(pngUrl: string) {
  try {
    const u = new URL(pngUrl);
    u.pathname = u.pathname.replace("/png/", "/normal/").replace(/\.png$/i, ".jpg");
    return u.toString();
  } catch {
    return pngUrl;
  }
}

export async function fetchWithRetry(url: string, retries = 3, baseDelay = 250): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      if (i === retries - 1) throw error;
    }
    
    const exponentialDelay = baseDelay * (2 ** i);
    const jitter = Math.random() * baseDelay;
    const totalDelay = exponentialDelay + jitter;
    
    console.log(`Fetch failed for ${url}. Retrying in ${Math.round(totalDelay)}ms... (Attempt ${i + 1}/${retries})`);
    
    await new Promise(res => setTimeout(res, totalDelay));
  }
  throw new Error(`Fetch failed for ${url} after ${retries} attempts.`);
}

export async function urlToFile(url: string, name: string): Promise<File> {
  // 1. Applica la logica di proxy
  const proxiedUrl = toProxied(url);

  // 2. Esegui il fetch in modo robusto
  const response = await fetchWithRetry(proxiedUrl, 3); // Usa 3 tentativi come default

  // 3. Ottieni i dati binari come Blob
  const blob = await response.blob();

  // 4. Crea il nome del file e l'oggetto File
  const mimeType = blob.type || "image/jpeg"; // Tenta di usare il tipo dal Blob, fallback a JPG
  const extension = mimeType.split('/')[1] || 'jpg';
    
  // Pulisci il nome per un filename valido e aggiungi l'estensione.
  const filename = `${name.replace(/[^a-z0-9]/gi, '_')}.${extension}`; 
    
  // L'oggetto File è ciò che simulerà il file caricato dall'utente
  return new File([blob], filename, { type: mimeType });
}