import type { TranslationKey } from '@/i18n';

/**
 * Valores gravados em `brands.categories`. Ficam em português mesmo quando a
 * interface está em outro idioma — o rótulo é traduzido na exibição, o valor
 * persistido não, senão a mesma marca gravaria categorias diferentes conforme
 * o idioma em que o perfil foi editado.
 */
export const CATEGORY_OPTIONS = ['Acessórios', 'Bolsas', 'Roupas', 'Bonecas', 'Decoração'];

export const CATEGORY_LABEL_KEYS: Record<string, TranslationKey> = {
  'Acessórios': 'categoryAccessories',
  'Bolsas': 'categoryBags',
  'Roupas': 'categoryClothes',
  'Bonecas': 'categoryDolls',
  'Decoração': 'categoryDecor',
};
