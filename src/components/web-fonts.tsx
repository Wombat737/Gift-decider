import { useEffect } from 'react';
import { Platform } from 'react-native';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap';

/** Loads Plus Jakarta Sans in expo start --web as well as static export. Headings use the same sans. */
export function WebFonts() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (document.getElementById('coral-coast-fonts')) return;
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = 'https://fonts.googleapis.com';
    const gstatic = document.createElement('link');
    gstatic.rel = 'preconnect';
    gstatic.href = 'https://fonts.gstatic.com';
    gstatic.crossOrigin = 'anonymous';
    const sheet = document.createElement('link');
    sheet.id = 'coral-coast-fonts';
    sheet.rel = 'stylesheet';
    sheet.href = FONT_HREF;
    document.head.append(preconnect, gstatic, sheet);
  }, []);

  return null;
}
