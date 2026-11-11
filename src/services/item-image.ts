import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { usesDemoData } from '@/lib/app-mode';
import { env } from '@/lib/env';
import {
  WISHLIST_IMAGE_MAX_BYTES,
  WISHLIST_IMAGES_BUCKET,
  dataUrlFromBase64,
  mimeFromFile,
  wishlistImageObjectPath,
} from '@/lib/item-image';
import { PHOTO_JPEG_QUALITY, resizeAction } from '@/lib/prepare-photo';
import { supabase } from '@/lib/supabase';

export type GiftPhotoSource = 'library' | 'camera';

function pickerOptions(): ImagePicker.ImagePickerOptions {
  return {
    mediaTypes: ['images'],
    // Skip the picker's full-size JPEG+base64 encode. We resize before upload.
    quality: 1,
    allowsMultipleSelection: false,
    exif: false,
    base64: false,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    shouldDownloadFromNetwork: true,
  };
}

export type PhotoProgress = (fraction: number) => void;

/** Resize to 1600px and recompress. Full-size base64 uploads were the slow path. */
export async function compressGiftPhoto(uri: string, knownWidth = 0, knownHeight = 0) {
  const format = ImageManipulator.SaveFormat.JPEG;
  let width = knownWidth;
  let height = knownHeight;
  let source = uri;
  if (width <= 0 || height <= 0) {
    const probe = await ImageManipulator.manipulateAsync(uri, [], { compress: 1, format });
    width = probe.width;
    height = probe.height;
    source = probe.uri;
  }
  const action = resizeAction(width, height);
  return ImageManipulator.manipulateAsync(source, action ? [action] : [], {
    compress: PHOTO_JPEG_QUALITY,
    format,
  });
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

    // PHPicker does not need photo-library permission. Requesting it first makes
    // iOS hand back a limited library, then fail to read the file ("public.jpeg"),
    // while the camera path still works.
    const result = await ImagePicker.launchImageLibraryAsync(pickerOptions());
    if (result.canceled) return null;
    return result.assets[0] ?? null;
  } catch (err) {
    if (err instanceof Error && /allow (camera|photos)|choose a photo/i.test(err.message)) throw err;
    if (source === 'camera') throw new Error('No camera on this device');
    throw new Error('Couldn’t add that photo');
  }
}

async function blobFromUri(uri: string) {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Couldn’t read that photo');
  const blob = await response.blob();
  if (blob.size === 0) throw new Error('Couldn’t read that photo');
  return blob;
}

function uploadErrorMessage(status: number) {
  if (status === 401 || status === 403) return 'Sign in again to add a photo';
  if (status === 413) return 'That photo is still too large. Try another.';
  return 'Couldn’t upload that photo. Check your connection and try again.';
}

function uploadWithProgress(path: string, body: Blob, token: string, onProgress?: PhotoProgress) {
  const endpoint = `${env.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${WISHLIST_IMAGES_BUCKET}/${path}`;
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', env.supabaseAnonKey);
    xhr.setRequestHeader('Content-Type', 'image/jpeg');
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(uploadErrorMessage(xhr.status)));
    };
    xhr.onerror = () => reject(new Error('Couldn’t upload that photo. Check your connection and try again.'));
    xhr.send(body);
  });
}

export async function uploadGiftPhoto(asset: ImagePicker.ImagePickerAsset, onProgress?: PhotoProgress): Promise<string> {
  onProgress?.(0.05);
  const prepared = await compressGiftPhoto(asset.uri, asset.width ?? 0, asset.height ?? 0).catch(() => null);
  if (!prepared) throw new Error('Couldn’t prepare that photo. Try a different one.');
  onProgress?.(0.3);

  if (usesDemoData() || !supabase) {
    const blob = await blobFromUri(prepared.uri);
    const dataUrl = await fileToDataUrl(blob, 'image/jpeg');
    onProgress?.(1);
    return dataUrl;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const userId = sessionData.session?.user?.id;
  if (!token || !userId) throw new Error('Sign in to add a photo');

  const blob = await blobFromUri(prepared.uri);
  if (blob.size > WISHLIST_IMAGE_MAX_BYTES) {
    throw new Error('That photo is still too large after compressing. Try another.');
  }

  const path = wishlistImageObjectPath(userId, 'jpg');
  try {
    await uploadWithProgress(path, blob, token, (fraction) => onProgress?.(0.3 + fraction * 0.65));
  } catch (err) {
    // Fall back to the client upload if XHR is blocked, still using the small JPEG.
    const body = await blob.arrayBuffer();
    const { error } = await supabase.storage.from(WISHLIST_IMAGES_BUCKET).upload(path, body, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (error) throw err instanceof Error ? err : new Error('Couldn’t upload that photo');
  }

  const { data } = supabase.storage.from(WISHLIST_IMAGES_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error('Couldn’t upload that photo');
  onProgress?.(1);
  return data.publicUrl;
}
