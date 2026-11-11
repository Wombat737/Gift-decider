import { Image } from 'react-native';

const files: Record<string, number> = {
  'demo-mug': require('../../assets/demo/mug.jpg'),
  'demo-socks': require('../../assets/demo/socks.jpg'),
  'demo-book': require('../../assets/demo/cookbook.jpg'),
  'demo-plant': require('../../assets/demo/plant.jpg'),
  'demo-espresso': require('../../assets/demo/espresso.jpg'),
  'demo-grinder': require('../../assets/demo/grinder.jpg'),
  'demo-throw': require('../../assets/demo/throw.jpg'),
};

function uriFrom(file: unknown): string | null {
  if (typeof file === 'string' && file) return file;
  if (file && typeof file === 'object' && 'uri' in file && typeof (file as { uri?: unknown }).uri === 'string') {
    return (file as { uri: string }).uri;
  }
  const resolver = (Image as { resolveAssetSource?: (source: number) => { uri?: string } | null }).resolveAssetSource;
  if (typeof resolver === 'function') {
    try {
      return resolver(file as number)?.uri ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

export function demoImageUri(id: string): string | null {
  const file = files[id];
  if (!file) return null;
  return uriFrom(file);
}
