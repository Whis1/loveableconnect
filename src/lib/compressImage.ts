// 📦 Compressione immagini LATO CLIENT prima dell'upload.
//
// Problema: un utente che carica una foto da smartphone può facilmente
// mandare un file da 5-12 MB. Salvarlo così com'è significa:
//   - storage che si riempie in fretta (costo)
//   - upload lenti su mobile
//   - l'originale pesante resta comunque la "fonte" anche se poi lo serviamo
//     ridimensionato (le trasformazioni partono comunque dall'originale).
//
// Soluzione: prima di caricare, ridimensioniamo il lato più lungo a max 1600px
// e ricomprimiamo in JPEG qualità ~0.82 usando un <canvas>. Nessuna libreria
// esterna (niente da installare), funziona in tutti i browser moderni.
//
// Risultato tipico: una foto da 8 MB scende a ~300-600 KB mantenendo ottima
// qualità per lo schermo. L'originale "vero" non serve mai a piena risoluzione
// in un'app di incontri.

const MAX_DIMENSION = 1600; // lato più lungo, in px
const JPEG_QUALITY = 0.82; // 0–1
// Sopra questa soglia (in byte) vale la pena comprimere; sotto, l'originale è
// già leggero e lo lasciamo com'è (evita di ricomprimere immagini già piccole).
const SKIP_IF_SMALLER_THAN = 400 * 1024; // 400 KB

/**
 * Comprime/ridimensiona un'immagine. Ritorna un nuovo File JPEG, oppure il
 * file originale se: non è un'immagine raster, è già piccolo, o la compressione
 * fallisce (fallback sicuro: meglio caricare l'originale che bloccare l'utente).
 */
export async function compressImage(file: File): Promise<File> {
  // Solo immagini raster. GIF animate / SVG: lasciate intatte.
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return file;
  }
  // Già leggera: non vale la pena.
  if (file.size <= SKIP_IF_SMALLER_THAN) return file;

  try {
    const bitmap = await loadBitmap(file);
    const { width, height } = scaleToFit(bitmap.width, bitmap.height, MAX_DIMENSION);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    // Libera memoria del bitmap se possibile
    if ("close" in bitmap && typeof (bitmap as ImageBitmap).close === "function") {
      (bitmap as ImageBitmap).close();
    }

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob || blob.size >= file.size) {
      // La compressione non ha aiutato (immagine già ottimizzata): tieni l'originale.
      return file;
    }

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    // Qualunque errore → carica l'originale (non bloccare mai l'utente).
    return file;
  }
}

// Carica l'immagine come bitmap (createImageBitmap se disponibile, altrimenti
// fallback con <img> + objectURL).
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return await createImageBitmap(file);
  }
  return await new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function scaleToFit(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = w > h ? max / w : max / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}
