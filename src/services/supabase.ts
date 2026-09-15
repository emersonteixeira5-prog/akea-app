import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

declare const process: {
  env: {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
  };
};

// As variáveis EXPO_PUBLIC_* são lidas automaticamente do .env pelo Expo.
// Copie .env.example para .env e preencha com os dados reais do seu projeto.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function urlValido(valor: string | undefined) {
  if (!valor) return false;
  try {
    return /^https?:$/.test(new URL(valor).protocol);
  } catch {
    return false;
  }
}

// A chave anon é um JWT: três segmentos base64url separados por ponto. Vale
// checar o formato porque uma chave truncada na cópia passa num teste de
// "existe?" e depois só se manifesta como falha de rede nas chamadas — que é
// fácil de confundir com CORS.
function chaveValida(valor: string | undefined) {
  return Boolean(valor && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(valor));
}

const urlOk = urlValido(supabaseUrl);
const chaveOk = chaveValida(supabaseAnonKey);

export const isSupabaseConfigured = urlOk && chaveOk;

if (!isSupabaseConfigured) {
  const problema = !supabaseUrl && !supabaseAnonKey
    ? 'nenhuma das duas variáveis está definida'
    : [!urlOk && (supabaseUrl ? 'EXPO_PUBLIC_SUPABASE_URL não é uma URL http(s) válida' : 'EXPO_PUBLIC_SUPABASE_URL não está definida'),
       !chaveOk && (supabaseAnonKey ? 'EXPO_PUBLIC_SUPABASE_ANON_KEY não tem formato de JWT (provável cópia truncada)' : 'EXPO_PUBLIC_SUPABASE_ANON_KEY não está definida')]
        .filter(Boolean)
        .join('; ');

  console.warn(
    `[Supabase] Configuração inválida: ${problema}. Usando credenciais de placeholder — ` +
      'as chamadas ao Supabase vão falhar como erro de rede até isto ser corrigido. ' +
      'Copie .env.example para .env, preencha com os dados do seu projeto e reinicie o `expo start`.'
  );
}

// Com URL/chave de placeholder o cliente é criado sem erro (a lib só valida o
// formato da URL, não se ela responde), então o app sobe normalmente. Chamadas
// reais ao Supabase (login, etc.) vão falhar até o .env ser preenchido —
// mas isso não derruba o app inteiro como acontecia antes.
// O fallback segue a validação, não só a presença: com uma URL malformada o
// createClient receberia o valor inválido e podia lançar já na importação,
// derrubando o app antes de qualquer tela — que é o oposto do que o
// placeholder existe para fazer.
export const SUPABASE_URL = urlOk ? (supabaseUrl as string) : 'https://placeholder.supabase.co';

export const supabase = createClient(
  SUPABASE_URL,
  chaveOk ? (supabaseAnonKey as string) : 'placeholder.placeholder.placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

/**
 * Buckets do Storage que existem no projeto, conferidos por sondagem em
 * 14/09/2026 — bucket inexistente responde "Bucket not found", arquivo
 * inexistente responde "Object not found", e é assim que dá pra separar.
 *
 * Ficam aqui, e não no hook de upload, porque dois hooks e uma tela
 * precisam deles. Nome de bucket em string solta já custou caro: a tela de
 * produção enviava para um 'produtos' que nunca existiu, e nada apontava o
 * erro até alguém tentar usar.
 *
 * ATENÇÃO ao maiúsculo de `Logos` e `Videos`: nome de bucket é sensível a
 * caixa, e 'logos' minúsculo responde "Bucket not found".
 */
export type StorageBucket =
  | 'Logos'
  | 'Videos'
  | 'product-photos'
  | 'donation-photos'
  | 'result-photos'
  | 'avatars';

/** Os buckets que recebem imagem — `Videos` fica de fora de propósito. */
export type ImageBucket = Exclude<StorageBucket, 'Videos'>;

/**
 * Tipos básicos das tabelas — vão crescer conforme o modelo de dados for
 * desenhado em detalhe. Por enquanto cobrem o que as telas já desenhadas
 * (Home, Perfil da Marca, Doação) precisam consumir.
 */
export type AccountType = 'user' | 'brand';

export type Profile = {
  id: string;
  account_type: AccountType;
  full_name: string;
  city: string | null;
  impact_points: number;
  avatar_url: string | null;
};

export type Brand = {
  id: string;
  owner_id: string;
  name: string;
  bio: string | null;
  instagram: string | null;
  instagram_url: string | null;
  website_url: string | null;
  cnpj_cpf: string | null;
  pickup_address: string | null;
  logo_url: string | null;
  categories: string[];
  video_url: string | null;
};

export type Product = {
  id: string;
  brand_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  status: 'active' | 'sold';
  photo_url: string | null;
  is_unique_piece: boolean;
};

export type Donation = {
  id: string;
  user_id: string;
  brand_id: string;
  material_types: string[];
  quantity_estimate: 'few_items' | 'medium_bag' | 'large_bag';
  photo_url: string | null;
  status:
    | 'registered'
    | 'received'
    | 'evaluated'
    | 'transforming'
    | 'completed'
    | 'rejected';
  result_photo_url: string | null;
  result_product_id: string | null;
  points_awarded: number | null;
  created_at: string;
};
export type Banner = {
  id: string;
  image_url: string;
  sort_order: number;
};

export type Address = {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
  created_at: string;
};

export type OrderStatus = 'pending_payment' | 'paid' | 'ready' | 'completed';

export type Order = {
  id: string;
  brand_id: string;
  user_id: string;
  status: OrderStatus;
  total_cents: number;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price_cents: number;
};

export type OrderStage = {
  id: string;
  order_id: string;
  stage_name: string;
  description: string | null;
  photo_url: string | null;
  created_at: string;
};

export type BrandFollower = {
  id: string;
  user_id: string;
  brand_id: string;
  created_at: string;
};