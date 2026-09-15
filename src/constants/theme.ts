/**
 * Design tokens do AKEA Moda Circular.
 * Cores extraídas da identidade visual: amarelo vibrante + azul-marinho.
 * Ajuste os valores aqui se a marca atualizar a paleta — todo o app referencia
 * estas constantes, então uma mudança aqui se propaga pro app inteiro.
 */

export const colors = {
  // Cores de marca
  primary: '#F9EE77', // amarelo — cor dominante de fundo
  secondary: '#2D2B8F', // azul-marinho — texto, ícones, botões primários

  // Neutros
  white: '#FFFFFF',
  surfaceMuted: '#F1EFE8', // fundo de placeholders de imagem, inputs, chips inativos
  border: '#D3D1C7',
  borderLight: '#E5E3D8',

  // Texto
  textOnPrimary: '#2D2B8F', // texto sobre fundo amarelo
  textOnSecondary: '#F9EE77', // texto sobre fundo navy
  textLabel: '#5F5E5A', // labels de formulário
  textMuted: '#888780', // texto secundário/legendas

  // Estados
  success: '#5DCAA5',
  successBg: '#E8F5EE',
  danger: '#D85A30',
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
} as const;

export const typography = {
  title: { fontSize: 22, fontWeight: '600' as const },
  subtitle: { fontSize: 14, fontWeight: '500' as const },
  body: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 11, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '600' as const },
};
