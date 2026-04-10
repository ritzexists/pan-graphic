import React, { useRef, useEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

function Test() {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      console.log('METHODS:', Object.keys(ref.current));
    }
  }, []);
  return <TransformWrapper ref={ref}><TransformComponent><div/></TransformComponent></TransformWrapper>;
}

renderToString(<Test />);
