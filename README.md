# AKEA Moda Circular — app mobile

Starter do app em **React Native + Expo**, com **Supabase** como backend.
Estrutura já organizada pra continuar a partir daqui: navegação completa
(modo usuário + modo marca), tema com as cores oficiais, e 3 telas
implementadas por completo como referência (as outras 14 são placeholders
prontos pra você preencher).

## Como rodar

```bash
npm install
cp .env.example .env   # depois preencha com a URL e a anon key do seu projeto Supabase
npx expo start
```

Abra o app **Expo Go** no celular e escaneie o QR code que aparece no
terminal — ou aperte `i` / `a` no terminal pra abrir num simulador iOS/Android
(precisa do Xcode ou Android Studio instalados).

## O que já está pronto

- **Splash nativa** configurada em `app.json` (fundo amarelo `#F9EE77` + logo).
  Troque `assets/splash-logo.png` pelo arquivo oficial do camaleão quando
  estiver exportado em PNG/SVG.
- **Onboarding, Login, Cadastro, Home, Perfil e Completar Perfil (usuário e marca)
  implementados de verdade** — todos já conversam com o Supabase. A marca não
  consegue acessar o resto do app sem completar o perfil (endereço do ponto de
  coleta é obrigatório) — isso é forçado no `RootNavigator`, não em cada tela.
- **Schema SQL completo** em `supabase/schema.sql` — cole no SQL Editor do
  seu projeto Supabase pra criar todas as tabelas, triggers e políticas de
  segurança (RLS) de uma vez.
- **Navegação completa**: ver `src/navigation/`. O app troca automaticamente
  entre Auth → Modo Usuário → Modo Marca com base na sessão e no
  `account_type` do Supabase.
- **Tema central** em `src/constants/theme.ts` — todas as cores, espaçamentos
  e raios de borda do app vêm daqui. Mudou a cor da marca? Muda só ali.
- **Cliente Supabase** em `src/services/supabase.ts`, já com os tipos
  (`Profile`, `Brand`, `Product`, `Donation`) que as telas vão consumir, e
  com fallback gracioso (não trava o app) se o `.env` ainda não tiver as
  credenciais reais.

## O que falta (próximos passos sugeridos)

1. **Rodar o `supabase/schema.sql`** no SQL Editor do seu projeto, se ainda
   não rodou — sem isso, o Cadastro cria o login mas não salva o perfil.
2. **Preencher as 13 telas placeholder restantes** (estão em `src/screens/`,
   cada uma já tem uma nota descrevendo o que precisa conter, vindo direto
   das telas que já desenhamos).
3. **Trocar os ícones genéricos do Feather** pelos logos reais de cada marca
   quando os arquivos estiverem disponíveis.
4. **Configurar Mercado Pago ou Pagar.me** pro checkout com Pix + split de
   pagamento (comissão automática).

## Estrutura de pastas

```
src/
  constants/theme.ts        → cores, espaçamento, tipografia
  services/supabase.ts      → cliente Supabase + tipos das tabelas
  components/                → ChameleonIcon, PlaceholderScreen, ui (botões/cards/chips)
  navigation/
    AuthStack.tsx            → Onboarding → Login → Cadastro → Completar perfil
    HomeStack.tsx            → Home → Perfil da marca → Produto → Carrinho → Checkout
    UserTabs.tsx              → tab bar do modo usuário (com botão flutuante "Doar")
    UserRootStack.tsx         → envolve as tabs + Registrar/Acompanhar doação
    BrandTabs.tsx              → tab bar do modo marca
    BrandRootStack.tsx         → envolve as tabs + Postar resultado
    RootNavigator.tsx          → decide Auth vs Usuário vs Marca
  screens/
    auth/      → Onboarding ✅, Login ✅, Cadastro, Completar perfil
    user/      → Home ✅, Perfil da marca, Detalhes do produto, Carrinho,
                 Checkout, Registrar doação, Acompanhar doação, Pontos,
                 Perfil/Configurações
    brand/     → Dashboard, Catálogo, Fila de doações, Postar resultado
```

✅ = implementada de verdade. As demais são placeholders funcionais.
