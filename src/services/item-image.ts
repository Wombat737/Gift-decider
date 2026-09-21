import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { usesDemoData } from '@/lib/app-mode';
import {
  WISHLIST_IMAGE_MAX_BYTES,
  WISHLIST_IMAGES_BUCKET,
  dataUrlFromBase64,
  extFromMime,
  mimeFromFile,
  wishlistImageObjectPath,
} from '@/lib/item-image';
import { supabase } from '@/lib/supabase';

export type GiftPhotoSource = 'library' | 'camera';

function pickerOptions(): ImagePicker.ImagePickerOptions {
  return {
    mediaTypes: ['images'],
    quality: 0.72,
    allowsMultipleSelection: false,
    exif: false,
  };
}

function fileToDataUrl(file: Blob, mime?: string | null): Promise<string> {
  if (typeof FileReader === 'undefined') {
    return Promise.reject(new Error('Couldn’t add that photo'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      if (result.startsWith('data:image/')) {
        resolve(result);
        return;
      }
      if (result.startsWith('data:') && mime) {
        const comma = result.indexOf(',');
        resolve(dataUrlFromBase64(result.slice(comma + 1), mime));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Couldn’t add that photo'));
    reader.readAsDataURL(file);
  });
}

/** Web file input — infers mime from the filename when the browser leaves type empty. */
function pickWebImageFile(capture: boolean): Promise<ImagePicker.ImagePickerAsset | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) input.setAttribute('capture', 'environment');
    input.setAttribute('data-testid', 'gift-photo-file');
    input.style.position = 'fixed';
    input.style.left = '0';
    input.style.top = '0';
    input.style.opacity = '0';
    input.style.width = '1px';
    input.style.height = '1px';

    let settled = false;
    const finish = (asset: ImagePicker.ImagePickerAsset | null, error?: Error) => {
      if (settled) return;
      settled = true;
      input.remove();
      if (error) reject(error);
      else resolve(asset);
    };

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      const mime = mimeFromFile(file.type, file.name);
      if (!mime.startsWith('image/')) {
        finish(null, new Error('Choose a photo'));
        return;
      }
      finish({
        uri: URL.createObjectURL(file),
        width: 0,
        height: 0,
        type: 'image',
        mimeType: mime,
        fileName: file.name,
        fileSize: file.size,
        file,
      });
    });
    input.addEventListener('cancel', () => finish(null));
    document.body.appendChild(input);
    input.click();
  });
}

export async function pickGiftPhoto(source: GiftPhotoSource): Promise<ImagePicker.ImagePickerAsset | null> {
  try {
    if (Platform.OS === 'web') {
      return await pickWebImageFile(source === 'camera');
    }

    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) throw new Error('Allow camera to take a picture');
      const result = await ImagePicker.launchCameraAsync(pickerOptions());
      if (result.canceled) return null;
      return result.assets[0] ?? null;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Allow photos to add a picture');
    const result = await ImagePicker.launchImageLibraryAsync(pickerOptions());
    if (result.canceled) return null;
    return result.assets[0] ?? null;
  } catch (err) {
    if (err instanceof Error && /allow (camera|photos)|choose a photo/i.test(err.message)) throw err;
    if (source === 'camera') throw new Error('No camera on this device');
    throw new Error('Couldn’t add that photo');
  }
}

async function persistLocalPhoto(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  if (asset.base64) return dataUrlFromBase64(asset.base64, asset.mimeType);
  if (asset.uri.startsWith('data:image/')) return asset.uri;
  if (asset.file) return fileToDataUrl(asset.file, asset.mimeType);
  try {
    const response = await fetch(asset.uri);
    if (!response.ok) return asset.uri;
    const blob = await response.blob();
    return await fileToDataUrl(blob, asset.mimeType || blob.type);
  } catch {
    return asset.uri;
  }
}

async function bodyFromAsset(asset: ImagePicker.ImagePickerAsset): Promise<{
  body: ArrayBuffer;
  contentType: string;
  ext: string;
}> {
  const contentType = mimeFromFile(asset.file?.type || asset.mimeType, asset.fileName);
  const ext = extFromMime(contentType, asset.fileName);

  if (asset.file) {
    const body = await asset.file.arrayBuffer();
    return { body, contentType, ext };
  }

  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error('Couldn’t read that photo');
  const body = await response.arrayBuffer();
  return { body, contentType, ext };
}

export async function uploadGiftPhoto(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  if (usesDemoData() || !supabase) return persistLocalPhoto(asset);

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Sign in to add a photo');

  const { body, contentType, ext } = await bodyFromAsset(asset);
  if (body.byteLength > WISHLIST_IMAGE_MAX_BYTES) {
    throw new Error('That photo is too large (8MB max)');
  }
  if (body.byteLength === 0) throw new Error('Couldn’t read that photo');

  const path = wishlistImageObjectPath(userId, ext);
  const { error } = await supabase.storage.from(WISHLIST_IMAGES_BUCKET).upload(path, body, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error('Couldn’t upload that photo');

  const { data } = supabase.storage.from(WISHLIST_IMAGES_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error('Couldn’t upload that photo');
  return data.publicUrl;
}
