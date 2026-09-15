import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {  } from 'react-native';
import { supabase, type ImageBucket } from '@/services/supabase';
import { showAlert } from '@/utils/alert';

/**
 * Abre a galeria, faz upload para o bucket indicado do Supabase Storage
 * e retorna a URL pública do arquivo.
 *
 * A lista de buckets vive em services/supabase.ts, junto do cliente, porque
 * o upload de vídeo também precisa dela. `ImageBucket` exclui `Videos`.
 */
export function useImageUpload(bucket: ImageBucket) {
  const [uploading, setUploading] = useState(false);

  async function pickAndUpload(folder = 'uploads'): Promise<string | null> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permissão necessária', 'Precisamos de acesso à galeria para selecionar fotos.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return null;

    const asset = result.assets[0];
    setUploading(true);

    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const ext = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase();
      const path = `${folder}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, blob, {
          contentType: asset.mimeType ?? 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        showAlert('Falha no upload', uploadError.message);
        return null;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    } catch (err: unknown) {
      showAlert('Erro ao fazer upload', String(err instanceof Error ? err.message : err));
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { pickAndUpload, uploading };
}
