'use client';

import { CldImage } from 'next-cloudinary';
import Image from 'next/image';
import { useState } from 'react';

interface CloudinaryImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  quality?: number | 'auto';
  crop?: 'auto' | 'crop' | 'fill' | 'fill_pad' | 'fit' | 'imagga_crop' | 'imagga_scale' | 'lfill' | 'limit' | 'lpad' | 'mfit' | 'mpad' | 'pad' | 'scale' | 'thumb';
  gravity?: 'auto' | 'center' | 'face' | 'face:center' | 'face:auto' | 'faces' | 'faces:center' | 'faces:auto' | 'body' | 'body:face' | 'north' | 'north_east' | 'east' | 'south_east' | 'south' | 'south_west' | 'west' | 'north_west';
  sizes?: string;
}

export function CloudinaryImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 'auto',
  crop = 'fill',
  gravity = 'auto',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
}: CloudinaryImageProps) {
  const [hasError, setHasError] = useState(false);

  // Check if the src is a Cloudinary URL
  const isCloudinaryUrl = src.includes('cloudinary.com') || src.includes('res.cloudinary.com');

  if (hasError || !isCloudinaryUrl) {
    // Fallback to regular Next.js Image component for non-Cloudinary URLs
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        priority={priority}
        sizes={sizes}
        onError={() => setHasError(true)}
      />
    );
  }

  // Extract public_id from Cloudinary URL
  let publicId = src;
  if (src.includes('res.cloudinary.com')) {
    const urlParts = src.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
      publicId = urlParts.slice(uploadIndex + 2).join('/');
      // Remove file extension
      publicId = publicId.replace(/\.[^/.]+$/, '');
    }
  }

  return (
    <CldImage
      src={publicId}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      quality={quality}
      crop={crop}
      gravity={gravity}
      sizes={sizes}
      onError={() => setHasError(true)}
    />
  );
}