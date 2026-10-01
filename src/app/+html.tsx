import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            touch-action: pan-x pan-y;
            overscroll-behavior: none;
          }
        `}} />
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('touchstart', function(event) {
            if (event.touches.length > 1) event.preventDefault();
          }, { passive: false });
          let lastTouchEnd = 0;
          document.addEventListener('touchend', function(event) {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) event.preventDefault();
            lastTouchEnd = now;
          }, { passive: false });
          document.addEventListener('gesturestart', function(event) {
            event.preventDefault();
          }, { passive: false });
        `}} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
