import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './Skeleton';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  quality?: number;
  className?: string;
  containerClassName?: string;
  fill?: boolean;
  sizes?: string;
  onLoad?: () => void;
  fallback?: string;
  blurDataURL?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  quality = 75,
  className,
  containerClassName,
  fill = false,
  sizes,
  onLoad,
  fallback = '/images/placeholder.png',
  blurDataURL,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    if (onLoad) onLoad();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  if (fill) {
    return (
      <div className={cn('relative overflow-hidden', containerClassName)}>
        {isLoading && (
          <Skeleton
            variant="rectangular"
            className="absolute inset-0"
            animation="pulse"
          />
        )}
        <Image
          src={hasError ? fallback : src}
          alt={alt}
          fill
          sizes={sizes || '100vw'}
          quality={quality}
          priority={priority}
          className={cn(
            'object-cover transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          placeholder={blurDataURL ? 'blur' : 'empty'}
          blurDataURL={blurDataURL}
        />
      </div>
    );
  }

  return (
    <div className={cn('relative inline-block', containerClassName)}>
      {isLoading && (
        <Skeleton
          variant="rectangular"
          width={width}
          height={height}
          className="absolute inset-0"
          animation="pulse"
        />
      )}
      <Image
        src={hasError ? fallback : src}
        alt={alt}
        width={width || 100}
        height={height || 100}
        quality={quality}
        priority={priority}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        placeholder={blurDataURL ? 'blur' : 'empty'}
        blurDataURL={blurDataURL}
      />
    </div>
  );
}

// Avatar component with optimization
export function OptimizedAvatar({
  src,
  alt,
  size = 40,
  className,
  fallback,
}: {
  src?: string;
  alt: string;
  size?: number;
  className?: string;
  fallback?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    // Fallback to initials
    const initials = alt
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div
        className={cn(
          'flex items-center justify-center bg-surface3 text-text-primary font-medium rounded-full',
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        role="img"
        aria-label={alt}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={cn('relative overflow-hidden rounded-full', className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        quality={90}
        className="object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

// Logo component with optimization
export function OptimizedLogo({
  src,
  alt,
  width = 32,
  height = 32,
  className,
  priority = true,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      quality={100}
      priority={priority}
      className={cn('object-contain', className)}
    />
  );
}