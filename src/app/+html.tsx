import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `
          :root { --tempo-chrome-bg: #ffffff; }
          @media (prefers-color-scheme: dark) {
            :root { --tempo-chrome-bg: #1a251f; }
          }
          html, body {
            background-color: var(--tempo-chrome-bg);
            touch-action: pan-x pan-y;
            overscroll-behavior: none;
            -webkit-text-size-adjust: 100%;
            text-size-adjust: 100%;
          }
          #root {
            background-color: var(--tempo-chrome-bg);
            height: 100vh;
            height: 100dvh;
            touch-action: pan-x pan-y;
          }
          button, a, [role="button"], [role="tab"], input, textarea, select {
            touch-action: pan-x pan-y;
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
          var lastTap = null;
          document.addEventListener('touchend', function(event) {
            if (event.changedTouches.length !== 1 || event.touches.length) return;
            var target = event.target;
            if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')) return;
            var touch = event.changedTouches[0];
            var now = Date.now();
            if (lastTap && now - lastTap.time < 300 &&
                Math.abs(touch.clientX - lastTap.x) < 28 &&
                Math.abs(touch.clientY - lastTap.y) < 28) {
              event.preventDefault();
              lastTap = null;
            } else {
              lastTap = { time: now, x: touch.clientX, y: touch.clientY };
            }
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
      </head>
      <body>{children}</body>
    </html>
  );
}
