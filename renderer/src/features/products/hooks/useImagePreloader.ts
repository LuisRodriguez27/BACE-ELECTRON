import { useEffect, useRef } from 'react';
import type { Product } from '../types';

/**
 * Precarga en background todas las imágenes de los productos usando el protocolo
 * personalizado de Electron `imagenes://`.
 *
 * La estrategia es:
 *  1. Recopilar todas las rutas relativas de imágenes de todos los productos.
 *  2. Crear objetos `Image` con `src = imagenes://<ruta>`.
 *  3. El browser (Chromium) los guardará en caché, por lo que cuando el usuario
 *     abra la vista detallada o el carrusel de la lista, las imágenes ya estarán
 *     disponibles sin necesidad de otra solicitud de red.
 *
 * Para no saturar la red NAS al inicio, la precarga se hace de forma escalonada:
 *  - Se procesan BATCH_SIZE imágenes cada BATCH_INTERVAL_MS.
 */

const BATCH_SIZE = 5;
const BATCH_INTERVAL_MS = 800;

export function useImagePreloader(products: Product[]) {
  // Guardamos referencias de los objetos Image para evitar que el GC los elimine
  const imgRefs = useRef<HTMLImageElement[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!products || products.length === 0) return;

    // Recopilar todas las rutas únicas
    const allPaths: string[] = [];
    const seen = new Set<string>();

    for (const product of products) {
      if (!product.images) continue;
      for (const path of product.images) {
        if (path && !seen.has(path)) {
          seen.add(path);
          allPaths.push(path);
        }
      }
    }

    if (allPaths.length === 0) return;

    let index = 0;
    imgRefs.current = [];

    const loadBatch = () => {
      const batch = allPaths.slice(index, index + BATCH_SIZE);
      for (const path of batch) {
        const img = new Image();
        img.src = `imagenes://${path}`;
        imgRefs.current.push(img);
      }
      index += BATCH_SIZE;

      if (index < allPaths.length) {
        timerRef.current = setTimeout(loadBatch, BATCH_INTERVAL_MS);
      }
    };

    // Empezar después de un pequeño delay inicial para no bloquear el render
    timerRef.current = setTimeout(loadBatch, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      // Liberar referencias
      imgRefs.current = [];
    };
  }, [products]);
}
