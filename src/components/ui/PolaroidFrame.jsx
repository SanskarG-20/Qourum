import React from 'react';

export function PolaroidFrame({
  imageSrc,
  alt,
  caption,
  rotationDeg = -8,
  width = 236,
  style = {},
  className = '',
}) {
  return (
    <figure
      className={`polaroid-frame ${className}`}
      style={{
        width: `${width}px`,
        transform: `rotate(${rotationDeg}deg)`,
        ...style,
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          overflow: 'hidden',
          backgroundColor: '#EEEEEE',
        }}
      >
        <img
          src={imageSrc}
          alt={alt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>
      {caption && (
        <figcaption
          style={{
            fontFamily: 'var(--font-hand)',
            fontSize: '23px',
            fontWeight: 600,
            color: '#111111',
            textAlign: 'center',
            marginTop: '12px',
            lineHeight: 1,
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
