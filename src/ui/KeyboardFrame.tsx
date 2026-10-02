import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

// Native keyboard avoidance owns the whole screen, so no guessed header offset.
// Mobile browsers report their visible area separately from the layout viewport.
export function KeyboardFrame({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null);
  useEffect(() => {
    if (!enabled || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const visual = window.visualViewport;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setViewport({ height: visual?.height ?? window.innerHeight, top: visual?.offsetTop ?? 0 }));
    };
    update();
    visual?.addEventListener('resize', update);
    visual?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      visual?.removeEventListener('resize', update);
      visual?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [enabled]);
  return <KeyboardAvoidingView enabled={enabled && Platform.OS !== 'web'} behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[{ flex: 1, minHeight: 0 }, enabled && Platform.OS === 'web' && viewport ? { position: 'absolute', left: 0, right: 0, top: viewport.top, height: viewport.height, overflow: 'hidden' } : undefined]}>{children}</KeyboardAvoidingView>;
}
