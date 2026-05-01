# AGENTS.md

## AgroNext — dois projetos, um banco

```
AgroServerNext/   Backend API (Express + Prisma, porta 3000)
AgroSystemNext/   Frontend (React Native + Expo Router, porta 8081)
```

**Database:** PostgreSQL.

> AgroSyncNext foi removido — todos os dados são buscados ao vivo do Asaas via API.

---

### Setup (ordem importa)

```bash
sudo systemctl start postgresql            # 1º — banco
cd AgroServerNext && npm run dev           # 2º — API :3000
cd AgroSystemNext && npm start             # 3º — Expo :8081
```

---

### Comandos por projeto

**Backend (`AgroServerNext/`):**
| Comando | O que faz |
|---|---|
| `npm run dev` | Dev server com `tsx watch` |
| `npx prisma generate` | Regenera Prisma Client |
| `npx prisma db push` | Sincroniza schema com o banco |
| `npx prisma migrate dev` | Cria migration (prefira `db:push`) |
| `npx prisma studio` | GUI do banco |

**Frontend (`AgroSystemNext/`):**
| Comando | O que faz |
|---|---|
| `npm start` | Expo Metro |
| `npm run android` / `ios` / `web` | Alvo específico |
| `npm run lint` | ESLint (`expo lint`) |

**Em qualquer projeto:** `npm run build` → `tsc`, sem testes configurados.

---

### Schema

**Modelos (`PublicSchema`):**
- **User** — vendedor, auth com JWT (bcrypt + jsonwebtoken)
- **Route** — rota de cobrança (month/year)
- **Client** — `asaasId` único, dados mínimos (fonte: Asaas)
- **Payment** — `asaasId` único, `installmentAsaasId` se parcelado
- **RoutePayment** — N:N Route↔Payment, `@@unique([routeId, paymentId])`
- **RouteClient** — N:N Route↔Client com `fichaNumber`
- **WebhookLog** — eventos recebidos do Asaas
- **VerificationCode** — (referenciado em `verificationService.ts`, pode estar ausente do schema)

**Regra:** `installmentAsaasId != null` → pagamento faz parte de parcelamento.

---

### API (AgroServerNext)

Todas as rotas **exceto** `/api/auth/*` exigem header `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Cadastro com verificação |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/profile` | Perfil (auth) |
| POST | `/api/routes` | Criar rota |
| GET | `/api/routes` | Listar rotas |
| GET | `/api/routes/:id` | Rotas + payments |
| GET | `/api/routes/:id/asaas-data` | Dados frescos do Asaas |
| GET | `/api/routes/:id/refresh-progress` | Progresso do refresh |
| POST | `/api/routes/add-payment` | Add 1 pagamento |
| POST | `/api/routes/add-installment` | Add parcelamento inteiro |
| DELETE | `/api/routes/:routeId/payments/:paymentAsaasId` | Remove da rota (aceita asaasId) |
| GET | `/api/clients/available?routeId=&search=` | Busca no Asaas (5 máx) |
| GET | `/api/clients/:clientId/payments` | Pagamentos do cliente (Asaas) |
| GET | `/api/users/sellers` | Lista vendedores |

---

### Cache híbrido (frontend)

- Ao abrir rota: cache do AsyncStorage (sem req)
- Botão "Atualizar": busca do Asaas e atualiza cache
- Após adicionar/remover: atualiza cache local

---

### Asaas — URLs e status

**URL correta:** `https://api.asaas.com/v3` (NÃO `www.asaas.com/api/v3`)

**Status de pagamento:**
- `RECEIVED`, `CONFIRMED`, `RECEIVED_IN_CASH` = Pago
- `OVERDUE` = Vencido
- Demais = Pendente

---

### Variáveis de ambiente

**Backend (`.env` em `AgroServerNext/`):**
```
DATABASE_URL="postgresql://agrouser@localhost:5432/AgroDB?schema=public"
ASAAS_ACCESS_TOKEN=$aact_...
JWT_SECRET=...
JWT_EXPIRES_IN=7d
PORT=3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

**Frontend (`.env` em `AgroSystemNext/`):**
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

---

### Padrões e convenções

- **Imports:** backend usa extensão `.js` nos imports TS (ex: `'../config/index.js'`) — exigência do `NodeNext`
- **Frontend path alias:** `@/` mapeia pra raiz de `AgroSystemNext/` (ex: `@/constants/theme`)
- **Erro handling:** `express-async-errors` + `AppError` class com `statusCode`
- **AsyncStorage** usado para token JWT e cache de rotas no frontend
- **react-native-paper** como UI library no frontend
- **`expo-env.d.ts`** é gitignored (gerado pelo Expo)

### Fluxo de dados

DB é apenas índice de IDs → Asaas é fonte de verdade → ao adicionar pagamento, cria registro no DB e busca dados frescos do Asaas.
