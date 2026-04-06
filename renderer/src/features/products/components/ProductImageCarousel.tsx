import React, { useState, useCallback } from 'react';
import { Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';

interface ProductImageCarouselProps {
  images?: string[] | null;
  productName?: string;
  /** Altura fija del carrusel. Ignorada si fillContainer es true. */
  height?: number;
  /** Si se debe mostrar la caja "sin imagen" cuando no hay imágenes */
  showEmptyState?: boolean;
  /**
   * Cuando es true el componente ocupa el 100% del alto y ancho del padre.
   * Útil cuando el contenedor padre ya tiene dimensiones fijas (ej: columna derecha de tarjeta).
   */
  fillContainer?: boolean;
}

const ProductImageCarousel: React.FC<ProductImageCarouselProps> = ({
  images,
  productName = 'Producto',
  height = 160,
  showEmptyState = true,
  fillContainer = false,
}) => {
  const currentImages = images || [];

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    emblaApi?.scrollTo(idx);
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Clases y estilos dinámicos según modo
  const containerClass = fillContainer
    ? 'relative w-full h-full overflow-hidden bg-gray-50'
    : 'relative w-full rounded-lg overflow-hidden bg-gray-50 border border-gray-100';
  const containerStyle = fillContainer ? undefined : { height };

  const emptyClass = fillContainer
    ? 'w-full h-full flex flex-col items-center justify-center text-gray-400'
    : 'w-full flex flex-col items-center justify-center text-gray-400';
  const emptyStyle = fillContainer ? undefined : { height };

  if (currentImages.length === 0) {
    if (!showEmptyState) return null;
    return (
      <div className={emptyClass} style={emptyStyle}>
        <ImageIcon size={28} className="opacity-30 mb-1" />
        <span className="text-[10px]">Sin imagen</span>
      </div>
    );
  }

  return (
    <div className={containerClass} style={containerStyle}>
      {/* Embla viewport */}
      <div className="overflow-hidden h-full" ref={emblaRef}>
        <div className="flex h-full touch-pan-y">
          {currentImages.map((imgPath, index) => (
            <div
              key={`${imgPath}-${index}`}
              className="flex-[0_0_100%] min-w-0 h-full flex items-center justify-center"
            >
              <img
                src={`imagenes://${imgPath}`}
                alt={`${productName} ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Controles solo si hay más de una imagen */}
      {currentImages.length > 1 && (
        <>
          <button
            type="button"
            onClick={scrollPrev}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors"
            aria-label="Imagen anterior"
          >
            <ChevronLeft size={12} />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors"
            aria-label="Siguiente imagen"
          >
            <ChevronRight size={12} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1 z-10">
            {currentImages.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Ir a imagen ${index + 1}`}
                onClick={(e) => scrollTo(e, index)}
                className={`rounded-full transition-all ${
                  index === selectedIndex
                    ? 'bg-white w-3 h-1.5'
                    : 'bg-white/50 w-1.5 h-1.5'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ProductImageCarousel;

