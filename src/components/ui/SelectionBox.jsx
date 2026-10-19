import React from 'react';

export function SelectionBox({
  children,
  borderColor = '#42D2ED',
  handleFill = '#42D2ED',
  handleStroke = '#111111',
  handleSize = '12px',
  style = {},
  className = '',
  ...rest
}) {
  const customStyle = {
    '--box-color': borderColor,
    '--handle-fill': handleFill,
    '--handle-stroke': handleStroke,
    '--handle-size': handleSize,
    ...style,
  };

  return (
    <div className={`selection-box ${className}`} style={customStyle} {...rest}>
      <span aria-hidden="true" className="selection-box__handle selection-box__handle--tl" />
      <span aria-hidden="true" className="selection-box__handle selection-box__handle--tr" />
      <span aria-hidden="true" className="selection-box__handle selection-box__handle--bl" />
      <span aria-hidden="true" className="selection-box__handle selection-box__handle--br" />
      {children}
    </div>
  );
}
