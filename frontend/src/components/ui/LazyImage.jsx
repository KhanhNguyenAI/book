import React, { useState, useEffect, useRef } from 'react';

/**
 * LazyImage Component - Lazy loads images với loading="lazy" attribute
 * 
 * Features:
 * - Lazy loading native (intersection observer fallback)
 * - Placeholder/skeleton loading state
 * - Error fallback image
 * - WebP image support
 * 
 * Usage:
 * <LazyImage 
 *   src="image.webp"
 *   alt="Book cover"
 *   fallback="/default-cover.webp"
 *   className="book-image"
 *   width={200}
 *   height={300}
 * />
 */

const LazyImage = ({
  src,
  alt = 'Image',
  fallback = '/default-cover.webp',
  className = '',
  width,
  height,
  style = {},
  loading = 'lazy', // 'lazy' or 'eager'
  onLoad,
  onError,
  placeholder = null, // Custom placeholder component
  placeholderBg = '#f0f0f0' // Default placeholder background color
}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(loading === 'eager');
  const imgRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loading !== 'lazy' || isInView) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '50px', // Start loading 50px before image enters viewport
        threshold: 0
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [loading, isInView]);

  // Load image when in view or eager loading
  useEffect(() => {
    if (!isInView) return;

    const testImg = new Image();

    testImg.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
      setHasError(false);
      if (onLoad) onLoad();
    };

    testImg.onerror = () => {
      setImageSrc(fallback);
      setIsLoaded(true);
      setHasError(true);
      if (onError) onError();
    };

    testImg.src = src;
  }, [isInView, src, fallback, onLoad, onError]);

  const containerStyle = {
    ...style,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: !isLoaded ? placeholderBg : 'transparent',
    ...(width && { width }),
    ...(height && { height }),
    aspectRatio: width && height ? `${width} / ${height}` : undefined
  };

  return (
    <div
      ref={imgRef}
      className={`lazy-image-container ${className}`}
      style={containerStyle}
    >
      {/* Placeholder */}
      {!isLoaded && placeholder ? (
        <div className="lazy-image-placeholder">{placeholder}</div>
      ) : null}

      {/* Image */}
      {isInView && (
        <img
          src={imageSrc || src}
          alt={alt}
          loading={loading}
          className={`lazy-image ${className} ${isLoaded ? 'loaded' : 'loading'}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'opacity 0.3s ease-in-out',
            opacity: isLoaded ? 1 : 0.7
          }}
          onLoad={() => {
            setIsLoaded(true);
            if (onLoad) onLoad();
          }}
          onError={() => {
            setHasError(true);
            if (onError) onError();
          }}
        />
      )}

      {/* Error indicator */}
      {hasError && (
        <div
          className="lazy-image-error"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f5f5',
            fontSize: '12px',
            color: '#999'
          }}
        >
          Image not available
        </div>
      )}
    </div>
  );
};

export default LazyImage;

