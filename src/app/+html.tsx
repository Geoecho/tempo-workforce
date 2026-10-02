import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            touch-action: pan-x pan-y;
            overscroll-behavior: none;
            -webkit-text-size-adjust: 100%;
            text-size-adjust: 100%;
          }
          input, textarea, select { font-size: 16px !important; }
        `}} />
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('touchstart', function(event) {
            if (event.touches.length > 1) event.preventDefault();
          }, { passive: false });
          document.addEventListener('touchmove', function(event) {
            if (event.touches.length > 1) event.preventDefault();
          }, { passive: false });
          ['gesturestart', 'gesturechange', 'gestureend'].forEach(function(name) {
            document.addEventListener(name, function(event) { event.preventDefault(); }, { passive: false });
          });
          document.addEventListener('wheel', function(event) {
            if (event.ctrlKey || event.metaKey) event.preventDefault();
          }, { passive: false });
          document.addEventListener('keydown', function(event) {
            const zoomKey = ['+', '=', '-', '_', '0'].includes(event.key) ||
              ['NumpadAdd', 'NumpadSubtract', 'Numpad0'].includes(event.code);
            if ((event.ctrlKey || event.metaKey) && zoomKey) event.preventDefault();
          }, { passive: false });
        `}} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
