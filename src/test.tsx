import React from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
const Test = () => (
  <TransformWrapper>
    {({ zoomIn, zoomOut, resetTransform, centerView }: any) => (
      <TransformComponent>
        <div />
      </TransformComponent>
    )}
  </TransformWrapper>
);
