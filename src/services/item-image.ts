import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { usesDemoData } from '@/lib/app-mode';
import {
  WISHLIST_IMAGE_MAX_BYTES,
  WISHLIST_IMAGES_BUCKET,
  dataUrlFromBase64,
  extFromMime,
  mimeFromExt,
  wishlistImageObjectPath,
} from '@/lib/item-image';
import { supabase } from '@/lib/supabase';

export type GiftPhotoSource = 'library' | 'camera';

function pickerOptions(base64: boolean): ImagePicker.ImagePickerOptions {
  return {
    mediaTypes: ['images'],
    quality: 0.72,
    allowsMultipleSelection: false,
    exif: false,
    base64,
  };
}

export async function pickGiftPhoto(source: GiftPhotoSource): Promise<ImagePicker.ImagePickerAsset | null> {
  const persistLocal = usesDemoData() || !supabase;
  const options = pickerOptions(persistLocal);

  try {
    if (source === 'camera') {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) throw new Error('Allow camera to take a picture');
      }
      const result = await ImagePicker.launchCameraAsync(options);
      if (result.canceled) return null;
      return result.assets[0] ?? null;
    }

    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Allow photos to add a picture');
    }
    const result = await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return null;
    return result.assets[0] ?? null;
  } catch (err) {
    if (err instanceof Error && /allow (camera|photos)/i.test(err.message)) throw err;
    if (source === 'camera') throw new Error('No camera on this device');
    throw new Error('Couldn’t add that photo');
  }
}

async function persistLocalPhoto(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  if (asset.base64) return dataUrlFromBase64(asset.base64, asset.mimeType);
  if (asset.uri.startsWith('data:')) return asset.uri;
  try {
    const response = await fetch(asset.uri);
    if (!response.ok) return asset.uri;
    const blob = await response.blob();
    if (typeof FileReader === 'undefined') return asset.uri;
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error('Couldn’t add that photo'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return asset.uri;
  }
}

async function bodyFromAsset(asset: ImagePicker.ImagePickerAsset): Promise<{
  body: ArrayBuffer;
  contentType: string;
  ext: string;
}> {
  const ext = extFromMime(asset.mimeType ?? asset.file?.type, asset.fileName);
  const contentType = asset.file?.type || asset.mimeType || mimeFromExt(ext);

  if (asset.file) {
    const body = await asset.file.arrayBuffer();
    return { body, contentType: asset.file.type || contentType, ext };
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
