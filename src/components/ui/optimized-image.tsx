import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { CloudinaryImage } from './cloudinary-image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onError?: () => void;
  onLoad?: () => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  fallbackSrc = '/placeholder-image.svg',
  width,
  height,
  className,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 85,
  placeholder = 'empty',
  blurDataURL,
  onError,
  onLoad,
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = useCallback(() => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
      onError?.();
    }
  }, [imgSrc, fallbackSrc, onError]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  // Generate low-quality placeholder for blur effect
  const generateBlurDataURL = (w: number = 10, h: number = 10) => {
    return `data:image/svg+xml;base64,${Buffer.from(
      `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
      </svg>`
    ).toString('base64')}`;
  };

  const imageProps = {
    src: imgSrc,
    alt: alt || 'Image', // Ensure alt text is never empty
    className: cn(
      'transition-opacity duration-300',
      isLoading && 'opacity-0',
      !isLoading && 'opacity-100',
      className
    ),
    onError: handleError,
    onLoad: handleLoad,
    priority,
    quality,
    sizes,
    placeholder: placeholder === 'blur' ? 'blur' as const : 'empty' as const,
    blurDataURL:
      placeholder === 'blur'
        ? blurDataURL || generateBlurDataURL(width, height)
        : undefined,
  };

  // Check if the source is from Cloudinary
  const isCloudinaryUrl = imgSrc.includes('cloudinary.com') || imgSrc.includes('res.cloudinary.com');

  // Use CloudinaryImage for Cloudinary URLs when width and height are provided
  if (isCloudinaryUrl && width && height) {
    return (
      <div className="relative">
        <CloudinaryImage
          src={imgSrc}
          alt={alt || 'Image'}
          width={width}
          height={height}
          className={cn(
            'transition-opacity duration-300',
            isLoading && 'opacity-0',
            !isLoading && 'opacity-100',
            className
          )}
          priority={priority}
          quality="auto"
          sizes={sizes}
        />
        {isLoading && (
          <div
            className="absolute inset-0 bg-gray-200 animate-pulse rounded"
            style={{ width, height }}
          />
        )}
      </div>
    );
  }

  if (width && height) {
    return (
      <div className="relative">
        <Image
          {...imageProps}
          width={width}
          height={height}
        />
        {isLoading && (
          <div
            className="absolute inset-0 bg-gray-200 animate-pulse rounded"
            style={{ width, height }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <Image
        {...imageProps}
        fill
        style={{ objectFit: 'cover' }}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
    </div>
  );
};

// Hook for lazy loading images
export const useLazyImage = (src: string, threshold = 0.1) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [imageRef, setImageRef] = useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!imageRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(imageRef);

    return () => observer.disconnect();
  }, [imageRef, threshold]);

  return {
    ref: setImageRef,
    shouldLoad: isIntersecting,
    src: isIntersecting ? src : undefined,
  };
};

// Image loading skeleton component
export const ImageSkeleton: React.FC<{
  width?: number;
  height?: number;
  className?: string;
}> = ({ width, height, className }) => (
  <div
    className={cn(
      'bg-gray-200 animate-pulse rounded',
      className
    )}
    style={{ width, height }}
    role="img"
    aria-label="Loading image..."
  />
);

// Responsive image component with lazy loading
export const ResponsiveImage: React.FC<OptimizedImageProps & {
  aspectRatio?: string;
  lazy?: boolean;
}> = ({
  src,
  alt,
  aspectRatio = 'aspect-video',
  lazy = true,
  ...props
}) => {
    const { ref, shouldLoad, src: lazySrc } = useLazyImage(src);

    return (
      <div
        ref={ref}
        className={cn('relative overflow-hidden rounded', aspectRatio)}
      >
        {shouldLoad || !lazy ? (
          <OptimizedImage
            src={lazySrc || src}
            alt={alt}
            {...props}
          />
        ) : (
          <ImageSkeleton className="w-full h-full" />
        )}
      </div>
    );
  };

// Avatar component with optimized loading
export const Avatar: React.FC<{
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  className?: string;
}> = ({
  src,
  alt,
  size = 'md',
  fallback,
  className
}) => {
    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-12 h-12',
      lg: 'w-16 h-16',
      xl: 'w-24 h-24'
    };

    const dimensions = {
      sm: { width: 32, height: 32 },
      md: { width: 48, height: 48 },
      lg: { width: 64, height: 64 },
      xl: { width: 96, height: 96 }
    };

    return (
      <div className={cn(
        'relative rounded-full overflow-hidden bg-gray-200',
        sizeClasses[size],
        className
      )}>
        {src ? (
          <OptimizedImage
            src={src}
            alt={alt}
            fallbackSrc={fallback || '/avatar-placeholder.svg'}
            width={dimensions[size].width}
            height={dimensions[size].height}
            className="rounded-full"
            placeholder="blur"
          />
        ) : (
          <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">
            {alt.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    );
  };