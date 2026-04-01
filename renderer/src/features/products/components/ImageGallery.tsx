import React, { useState, useRef, useCallback } from 'react';
import { Image as ImageIcon, Upload, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

interface ImageGalleryProps {
  productId: number;
  images?: string[] | null;
  onUploadStart?: () => void;
  onImageAdded?: (relativePath: string) => void;
  onImageDeleted?: (relativePath: string) => void;
  onUploadError?: (error: string) => void;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  productId,
  images = [],
  onUploadStart,
  onImageAdded,
  onImageDeleted,
  onUploadError
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carousel hooks (Infinito y con Autoplay)
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true },
    [Autoplay({ delay: 4000, stopOnInteraction: true })]
  );
  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect, images]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = '';

    try {
      if (onUploadStart) onUploadStart();
      setIsUploading(true);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // @ts-ignore
      const result = await window.api.uploadImage(productId, buffer, file.name);

      if (result.success) {
        if (onImageAdded) onImageAdded(result.relativePath);
        // Scroll to the end after adding
        setTimeout(() => emblaApi?.scrollTo(images!.length), 100);
      } else {
        throw new Error('Fallo al subir la imagen.');
      }
    } catch (error: any) {
      console.error(error);
      if (onUploadError) onUploadError(error.message || 'Error desconocido.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteImage = async (relativePath: string) => {
    try {
      // Intentar eliminar fisicamente
      // @ts-ignore
      await window.api.deleteImage(relativePath);
      if (onImageDeleted) onImageDeleted(relativePath);
    } catch (e) {
      console.error('Error borrando fisicamente la imagen', e);
      // Igualmente quitarla de la UI
      if (onImageDeleted) onImageDeleted(relativePath);
    }
  };

  const currentImages = images || [];

  return (
    <div className="bg-white rounded-lg shadow p-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Galería del Producto</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleUploadClick}
          disabled={isUploading}
          className="flex items-center gap-2"
        >
          <Upload size={14} />
          {isUploading ? 'Subiendo...' : 'Añadir'}
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>

      <div className="flex-1 min-h-62.5 relative bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 overflow-hidden flex flex-col">
        {currentImages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-400">
            <ImageIcon size={48} className="mb-2 opacity-50" />
            <p className="text-sm font-medium">No hay imágenes asociadas.</p>
            <p className="text-xs mt-1 text-center">Sube fotos para crear una galería.</p>
          </div>
        ) : (
          <div className="relative flex-1 flex flex-col w-full h-full">
            <div className="overflow-hidden flex-1 flex" ref={emblaRef}>
              <div className="flex w-full h-full touch-pan-y">
                {currentImages.map((imgPath, index) => (
                  <div className="relative flex-[0_0_100%] min-w-0 h-full flex items-center justify-center p-2 group" key={`${imgPath}-${index}`}>
                    <img
                      src={`imagenes://${imgPath}`}
                      alt={`Producto ${index + 1}`}
                      className="w-full h-full object-contain max-h-75"
                    />
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8 rounded-full shadow-lg"
                        onClick={() => handleDeleteImage(imgPath)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Controles del Carrusel (si hay > 1 imagen) */}
            {currentImages.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow-md bg-white/80 hover:bg-white z-10"
                  onClick={scrollPrev}
                  disabled={!prevBtnEnabled}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow-md bg-white/80 hover:bg-white z-10"
                  onClick={scrollNext}
                  disabled={!nextBtnEnabled}
                >
                  <ChevronRight size={16} />
                </Button>
                {/* Dots */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
                  {currentImages.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all ${index === selectedIndex ? "bg-primary-600 w-4" : "bg-gray-300"
                        }`}
                      onClick={() => emblaApi?.scrollTo(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGallery;
