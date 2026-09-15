import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import {  } from 'react-native';
import { supabase, SUPABASE_URL, type StorageBucket } from '@/services/supabase';
import { showAlert } from '@/utils/alert';

// Uma constante para os dois usos abaixo. O envio é feito na mão, por
// XMLHttpRequest, para conseguir a barra de progresso — o que significa que
// o nome do bucket aparece duas vezes: na URL montada e no getPublicUrl.
// Separados, bastava alterar um para o arquivo subir num bucket e a URL
// apontar para outro, sem erro nenhum.
const BUCKET_VIDEOS: StorageBucket = 'Videos';

export function useVideoUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function pickAndUpload(brandId: string): Promise<string | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];

    setUploading(true);
    setProgress(0);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const userId = sessionData.session?.user.id;
      if (!token || !userId) throw new Error('Sessão expirada — faça login novamente.');

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const path = `${userId}/${brandId}/presentation.mp4`;
      const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET_VIDEOS}/${path}`;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Content-Type', asset.mimeType ?? 'video/mp4');
        xhr.setRequestHeader('x-upsert', 'true');
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload falhou: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Erro de rede durante o upload'));
        xhr.send(blob);
      });

      const { data } = supabase.storage.from(BUCKET_VIDEOS).getPublicUrl(path);
      return data.publicUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      showAlert('Erro no upload', msg);
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  return { uploading, progress, pickAndUpload };
}
