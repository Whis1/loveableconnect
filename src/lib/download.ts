/**
 * 💾 Forza il download di un file remoto (anziché aprirlo in nuova tab).
 *
 * Strategia: fetch del file come Blob, crea un object URL temporaneo
 * e simula un click su un anchor `<a download>`. Funziona con Supabase
 * Storage public URLs perché il bucket è pubblico e CORS-permissive.
 *
 * In caso di errore (CORS, rete, ...) fallback ad aprire in nuova tab.
 */
export async function downloadRemoteFile(url: string, filename: string) {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "download";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Pulisci dopo un attimo (lascia tempo al browser di iniziare il download)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (e) {
    console.warn("Download fallito, fallback a nuova tab:", e);
    window.open(url, "_blank");
  }
}
