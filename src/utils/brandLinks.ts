import { Linking, Platform } from 'react-native';
import type { Brand } from '@/services/supabase';

export type BrandLinkKind = 'instagram' | 'website';

type BrandLink = { kind: BrandLinkKind; appUrl: string | null; webUrl: string };

type BrandLinkFields = Pick<Brand, 'instagram' | 'instagram_url' | 'website_url'>;
type BrandLike = Partial<BrandLinkFields> | null | undefined;

function normalizeUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value.replace(/^\/+/, '')}`;
}

/**
 * Extrai o handle do Instagram. O campo `instagram` é digitado à mão no cadastro,
 * então chega como "@marca", "marca", "instagram.com/marca" ou a URL cheia.
 */
function instagramHandle(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  const handle = value
    .replace(/^https?:\/\//i, '')
    .replace(/^(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '')
    .trim();

  return handle || null;
}

/**
 * `instagram_url` é a URL explícita cadastrada pela marca e tem prioridade.
 * Sem ela, monta a URL a partir do handle em `instagram`.
 */
export function brandInstagramLink(brand: BrandLike): BrandLink | null {
  const handle = instagramHandle(brand?.instagram_url ?? brand?.instagram);
  if (!handle) return null;

  return {
    kind: 'instagram',
    appUrl: `instagram://user?username=${encodeURIComponent(handle)}`,
    webUrl: normalizeUrl(brand?.instagram_url) ?? `https://instagram.com/${encodeURIComponent(handle)}`,
  };
}

export function brandWebsiteLink(brand: BrandLike): BrandLink | null {
  const webUrl = normalizeUrl(brand?.website_url);
  return webUrl ? { kind: 'website', appUrl: null, webUrl } : null;
}

export function brandLinks(brand: BrandLike): BrandLink[] {
  return [brandInstagramLink(brand), brandWebsiteLink(brand)].filter((l): l is BrandLink => l !== null);
}

export function hasBrandLink(brand: BrandLike, kind?: BrandLinkKind): boolean {
  const links = brandLinks(brand);
  return kind ? links.some((l) => l.kind === kind) : links.length > 0;
}

/**
 * Abre o link social da marca. No celular tenta primeiro o app nativo e cai no
 * navegador se ele não estiver instalado; na web abre em nova aba.
 * Devolve false quando não há link ou nada pôde ser aberto — quem chama decide
 * se mostra aviso ou esconde o botão.
 */
export async function openBrandLink(brand: BrandLike, kind: BrandLinkKind = 'instagram'): Promise<boolean> {
  const link = brandLinks(brand).find((l) => l.kind === kind);
  if (!link) return false;

  // openURL rejeita quando não há app que atenda o scheme. Preferimos isso a
  // canOpenURL, que no iOS exige o scheme declarado em LSApplicationQueriesSchemes
  // e no Android 11+ exige <queries> — sem isso ele retorna false mesmo com o
  // app instalado, e o deep link nunca dispararia.
  if (Platform.OS !== 'web' && link.appUrl) {
    try {
      await Linking.openURL(link.appUrl);
      return true;
    } catch {
      // App não instalado — segue para o navegador.
    }
  }

  try {
    await Linking.openURL(link.webUrl);
    return true;
  } catch {
    return false;
  }
}
