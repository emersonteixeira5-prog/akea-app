import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';

export type CartItem = {
  productId: string;
  name: string;
  priceCents: number;
  brandId: string;
  brandName: string;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  usePoints: boolean;
  setUsePoints: (value: boolean) => void;
};

// Mesmo formato das outras chaves do app: @akea:language, @akea:onboarding_seen,
// @akea:notif_prefs.
const STORAGE_KEY = '@akea:cart';

const CartContext = createContext<CartContextValue | undefined>(undefined);

/**
 * Descarta item com formato diferente do esperado. O que está gravado hoje
 * foi escrito por uma versão anterior do app, que pode ter tido outros
 * campos — sem esta checagem, um `priceCents` ausente viraria NaN no
 * subtotal e o carrinho mostraria "R$ NaN" sem explicação.
 */
function itemValido(valor: unknown): valor is CartItem {
  if (typeof valor !== 'object' || valor === null) return false;
  const i = valor as Record<string, unknown>;
  return (
    typeof i.productId === 'string' &&
    typeof i.name === 'string' &&
    typeof i.priceCents === 'number' &&
    Number.isFinite(i.priceCents) &&
    typeof i.brandId === 'string' &&
    typeof i.brandName === 'string'
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [usePoints, setUsePoints] = useState(true);
  // Trava de hidratação: sem ela o efeito de gravar dispara na primeira
  // renderização, com o estado inicial vazio, e apaga o carrinho gravado
  // antes de a leitura do disco voltar. É a armadilha clássica deste padrão.
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    let vivo = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((bruto) => {
        if (!vivo || !bruto) return;
        const salvo = JSON.parse(bruto) as Record<string, unknown>;
        if (Array.isArray(salvo.items)) setItems(salvo.items.filter(itemValido));
        if (typeof salvo.usePoints === 'boolean') setUsePoints(salvo.usePoints);
      })
      .catch(() => {
        // JSON corrompido ou disco indisponível: começa com carrinho vazio.
        // Não vale avisar o usuário — ele não fez nada e não há o que fazer.
      })
      .finally(() => {
        if (vivo) setHidratado(true);
      });

    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items, usePoints })).catch(() => {
      // Gravação falhou: o carrinho segue funcionando nesta sessão e só não
      // sobrevive ao fechamento. Barulho de alerta aqui atrapalharia mais do
      // que ajudaria.
    });
  }, [items, usePoints, hidratado]);

  // Sair da conta esvazia o carrinho. O aparelho é o mesmo, mas a pessoa não:
  // sem isto, quem entrasse depois encontraria as peças escolhidas por quem
  // saiu. O efeito de gravar acima se encarrega de propagar o estado vazio
  // para o disco.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') {
        setItems([]);
        setUsePoints(true);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  function addItem(item: CartItem) {
    setItems((prev) => (prev.some((i) => i.productId === item.productId) ? prev : [...prev, item]));
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function clear() {
    setItems([]);
  }

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clear, usePoints, setUsePoints }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart precisa ser usado dentro de um <CartProvider>');
  return ctx;
}
