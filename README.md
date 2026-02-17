# Natillera On-Chain

Grupos de ahorro rotativo (natilleras/tandas) en la blockchain de Celo. Cada participante contribuye periódicamente y en cada ronda una persona recibe el pozo completo.

**Celo Agent Hackathon — "Build Agents for the Real World"**

## 🔗 Links

| Recurso | URL |
|---------|-----|
| 🌐 Frontend (MiniPay) | https://frontend-neon-nine-31.vercel.app |
| 📱 Farcaster Mini App | https://farcaster.xyz/miniapps/019c622a-bbde-2b35-f754-c4959984d062/natillera-on-chain |
| 📜 Smart Contract | [0xE9D8670897b7AEdFD7a7ACB783c229d63Ce76F2E](https://celoscan.io/address/0xE9D8670897b7AEdFD7a7ACB783c229d63Ce76F2E) |
| 🤖 ERC-8004 Agent ID | #12 en Celo Mainnet |
| 📊 Karma GAP | https://www.karmahq.xyz/ |

## 🤖 AI Agent (ERC-8004)

Este proyecto incluye un agente de IA registrado bajo el estándar **ERC-8004** en Celo Mainnet:
- **Agent ID:** #12
- **IdentityRegistry:** `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- **ReputationRegistry:** `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
- **Verificación SelfClaw:** Identidad humana verificada con ZK proof
- **Reputation score:** ~96-97/100 (25 feedbacks on-chain)

El agente automatiza:
- Seguimiento de contribuciones periódicas
- Distribución de fondos a recipientes
- Construcción de reputación on-chain

**Latam Buildathon 2026** — https://latamhubs.lat

## Arquitectura

```
/contracts          Smart contracts (Solidity)
  Natillera.sol       Contrato principal de cada grupo
  NatilleraFactory.sol  Factory para crear natilleras
  MockcUSD.sol        Mock ERC20 para testing
/scripts            Deploy scripts
/test               Smart contract tests (18 tests)
/frontend           React + Vite + TailwindCSS
  /src
    /components       Layout, ConnectWallet, NatilleraCard
    /hooks            useNatillera (factory, detail, actions, balance)
    /pages            Home, CreateNatillera, NatilleraDetail, History
    /utils            Contract ABIs, wagmi config
```

## Smart Contracts

### Natillera.sol
- Crear grupo con nombre, monto en cUSD, frecuencia (semanal/quincenal/mensual), max participantes
- Unirse depositando colateral (= 1 contribución)
- Contribuir cada ronda con la cuota en cUSD
- Pago automático al recipiente cuando todos contribuyen
- Orden aleatorio de pagos (shuffle con prevrandao)
- Penalización: pierde colateral si no paga a tiempo
- Colateral devuelto al completar todas las rondas
- Eventos: GroupCreated, MemberJoined, ContributionMade, PayoutSent, PenaltyApplied, NatilleraCompleted, CollateralReturned

### NatilleraFactory.sol
- Factory pattern para crear múltiples natilleras
- Tracking de natilleras por usuario
- Listado global de natilleras

### Direcciones cUSD
- **Celo Mainnet**: `0x765DE816845861e75A25fCA122bb6898B8B1282a`
- **Alfajores Testnet**: `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1`

## Frontend

- **Mobile-first** optimizado para MiniPay (Opera)
- Detección automática de MiniPay (`window.ethereum.isMiniPay`)
- Conectividad con wagmi/viem para Celo
- UI en español, tema verde Celo (#35D07F)
- Pantallas: Home, Crear Natillera, Detalle, Historial

## Requisitos

- Node.js >= 18
- npm >= 9

## Instalación

```bash
# Instalar dependencias del root (Hardhat)
npm install

# Instalar dependencias del frontend
cd frontend && npm install
```

## Uso

### Compilar contratos
```bash
npm run compile
```

### Ejecutar tests
```bash
npm run test
```

### Deploy a Alfajores (testnet)
```bash
cp .env.example .env
# Editar .env con tu PRIVATE_KEY
npm run deploy:alfajores
```

### Deploy a Celo Mainnet
```bash
npm run deploy:celo
```

### Iniciar frontend (dev)
```bash
npm run dev
```

### Build frontend
```bash
npm run build
```

## Configuración post-deploy

Después de deployar la factory, actualiza las direcciones en:
- `frontend/src/utils/contracts.js` → `FACTORY_ADDRESS`

## Tests

18 tests cubriendo:
- Factory: creación, tracking, validaciones
- Unirse: colateral, doble registro, auto-inicio, grupo lleno
- Contribuciones: pago, doble contribución, no miembros, ciclo completo
- Penalidades: forzar avance, deadline, contribución tardía
- Edge cases: monto cero, mínimo miembros, info de ronda

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Smart Contracts | Solidity 0.8.24, OpenZeppelin 5.x |
| Framework | Hardhat |
| Frontend | React 18, Vite 5, TailwindCSS 3 |
| Web3 | wagmi 2, viem 2 |
| Blockchain | Celo (EVM compatible) |
| Token | cUSD (stablecoin) |

## Licencia

MIT
