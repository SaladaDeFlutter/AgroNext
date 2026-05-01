<p align="center">
  <img src="AgroSystemNext/assets/images/icon.png" width="120" alt="AgroNext">
</p>

<h1 align="center">🌱 AgroNext</h1>

<p align="center">
  <strong>Gestão de rotas de cobrança com dados ao vivo do Asaas</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Express-4.x-green?logo=express" alt="Express">
  <img src="https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react" alt="React Native">
  <img src="https://img.shields.io/badge/Expo-54-000?logo=expo" alt="Expo">
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql" alt="PostgreSQL">
</p>

---

## Quick start

```bash
# 1. Inicie o banco
sudo systemctl start postgresql

# 2. Backend (porta 3000)
cd AgroServerNext && npm run dev

# 3. Frontend (porta 8081)
cd AgroSystemNext && npm start
```

> Todos os dados são buscados **ao vivo do Asaas** — o banco é apenas um índice de IDs.

---

## Arquitetura

```
AgroNext/
├── AgroServerNext/     ← API REST (Express + Prisma)
│   ├── src/
│   │   ├── controllers/   Lógica das rotas
│   │   ├── services/      Regras de negócio
│   │   ├── routes/        Definição dos endpoints
│   │   ├── middleware/     Auth JWT + error handler
│   │   └── api/           Cliente HTTP do Asaas
│   └── prisma/            Schema do banco
│
├── AgroSystemNext/     ← App mobile (React Native + Expo)
│   ├── app/               Rotas do Expo Router
│   ├── components/        Componentes reutilizáveis
│   ├── constants/         Tema e cores
│   └── hooks/             Hooks customizados
│
└── AGENTS.md            Instruções para OpenCode
```

**Fluxo de dados:**

<div align="center">

```
Asaas API ──► AgroServerNext ──► Banco (índice)
   ▲              │
   │              ▼
   └──── AgroSystemNext (cache AsyncStorage)
```

</div>

---

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/auth/register` | Cadastro com verificação |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/profile` | Perfil do usuário |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/routes` | Criar rota |
| `GET` | `/api/routes` | Listar rotas |
| `GET` | `/api/routes/:id` | Detalhes da rota |
| `GET` | `/api/routes/:id/asaas-data` | Dados frescos do Asaas |
| `POST` | `/api/routes/add-payment` | Adicionar pagamento |
| `POST` | `/api/routes/add-installment` | Adicionar parcelamento |
| `DELETE` | `/api/routes/:routeId/payments/:paymentId` | Remover pagamento |
| `GET` | `/api/clients/available` | Buscar clientes no Asaas |
| `GET` | `/api/clients/:clientId/payments` | Pagamentos do cliente |
| `GET` | `/api/users/sellers` | Listar vendedores |

> Todas as rotas (exceto `/api/auth/*`) exigem `Authorization: Bearer <token>`.

---

## Funcionalidades

- **Rotas de cobrança** — Criação e gerenciamento de rotas por mês/ano
- **Dados ao vivo** — Busca de pagamentos e clientes diretamente do Asaas
- **Parcelamentos** — Suporte a cobranças parceladas com agrupamento inteligente
- **Cache híbrido** — AsyncStorage para carregamento instantâneo + refresh manual
- **Ficha do cliente** — Número de ficha por cliente em cada rota
- **Relatório PDF** — Geração de relatório de inadimplentes
- **Autenticação** — JWT com verificação por email (SMTP)
- **Multi-vendedor** — Suporte a múltiplos vendedores com rotas próprias
- **Tema escuro** — Interface escura moderna e consistente

---

## Comandos

### Backend (`AgroServerNext/`)

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (`tsx watch`) |
| `npm run build` | Compilar TypeScript |
| `npx prisma generate` | Regenerar Prisma Client |
| `npx prisma db push` | Sincronizar schema com o banco |
| `npx prisma studio` | GUI do banco de dados |

### Frontend (`AgroSystemNext/`)

| Comando | Descrição |
|---------|-----------|
| `npm start` | Iniciar Expo Metro |
| `npm run android` | Rodar no Android |
| `npm run ios` | Rodar no iOS |
| `npm run web` | Rodar no navegador |
| `npm run lint` | ESLint |

---

## Variáveis de Ambiente

**Backend (`.env` em `AgroServerNext/`):**

```env
DATABASE_URL="postgresql://agrouser@localhost:5432/AgroDB?schema=public"
ASAAS_ACCESS_TOKEN=$aact_...
JWT_SECRET=seu-segredo-aqui
JWT_EXPIRES_IN=7d
PORT=3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

**Frontend (`.env` em `AgroSystemNext/`):**

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

---

## Modelo de Dados

```
User ──► Route ──► RoutePayment ──► Payment ──► Client
              └──► RouteClient
```

- **Route** — Rota de cobrança (mês/ano, vendedor)
- **Client** — Cliente sincronizado do Asaas (`asaasId` único)
- **Payment** — Cobrança (`asaasId` único, `installmentAsaasId` se parcelado)
- **RoutePayment** — Relacionamento N:N rota-pagamento
- **RouteClient** — Relacionamento N:N rota-cliente com número de ficha
- **WebhookLog** — Eventos recebidos do Asaas
- **User** — Vendedor com autenticação JWT

> Pagamento faz parte de parcelamento se `installmentAsaasId` não for nulo.

---

## Deploy

### Backend
```bash
cd AgroServerNext
npm run build
npx prisma generate
npm start
```

### Frontend (Web)
```bash
cd AgroSystemNext
npx expo export:web
# Serve o diretório dist/web-build
```

---

<p align="center">
  Feito por SaladaDeFlutter
</p>
