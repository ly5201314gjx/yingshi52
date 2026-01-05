import React, { useState } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({ src, alt, className, containerClassName, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-[#e5e5e0] ${containerClassName || ''}`}>
      {/* Placeholder / Skeleton */}
      <div 
        className={`absolute inset-0 bg-[#e5e5e0] transition-opacity duration-700 ${isLoaded ? 'opacity-0' : 'opacity-100'}`} 
      />
      
      {/* Actual Image */}
      <img
        src={error ? 'https://placehold.co/300x450/e5e5e0/a8a29e?text=No+Image' : src}
        alt={alt}
        loading="lazy"
        className={`w-full h-full object-cover transition-all duration-700 ease-out ${
          isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
        } ${className || ''}`}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
            setError(true);
            setIsLoaded(true); // Show placeholder/fallback
        }}
        {...props}
      />
    </div>
  );
};

export default LazyImage;