import { useAccount } from "wagmi";
import { Link } from "react-router-dom";
import ConnectWallet from "../components/ConnectWallet";
import NatilleraCard from "../components/NatilleraCard";
import { useFactory, useCUSDBalance, useNatilleraDetail } from "../hooks/useNatillera";

const KNOWN_NATILLERAS = [
  { name: "Natillera Colombia", address: "0xE9D8670897b7AEdFD7a7ACB783c229d63Ce76F2E" },
  { name: "Ahorro Semanal Medellín", address: "0xBbBE5ea3aF0bb6abea36f507DfD722F6c70E8926" },
  { name: "Tanda Familiar Bogotá", address: "0x28F97572d0f70ff7596e12e3C1043517FB96d046" },
  { name: "Natillera Navideña", address: "0x3416455b8b23957E2Fe1d72ceFA0F7f3c09b4415" },
];

const STATUS_BADGE = {
  0: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pendiente" },
  1: { bg: "bg-green-100", text: "text-green-700", label: "Activa" },
  2: { bg: "bg-gray-100", text: "text-gray-600", label: "Completada" },
  3: { bg: "bg-red-100", text: "text-red-600", label: "Cancelada" },
};

function NatilleraStatCard({ address, fallbackName }) {
  const detail = useNatilleraDetail(address);
  const badge = STATUS_BADGE[detail.status] || STATUS_BADGE[0];
  const displayName = detail.name || fallbackName || "Cargando...";

  return (
    <Link
      to={`/natillera/${address}`}
      className="block bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md hover:border-celo-green/30 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-gray-900 text-sm leading-tight">{displayName}</h4>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}>
          {detail.statusLabel || badge.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Cuota</p>
          <p className="text-sm font-bold text-gray-800">${detail.contributionAmount} <span className="text-[10px] font-normal text-gray-400">cUSD</span></p>
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Ronda</p>
          <p className="text-sm font-bold text-gray-800">
            {detail.roundInfo ? `${detail.roundInfo.round}/${detail.totalRounds}` : `—/${detail.totalRounds || "—"}`}
          </p>
        </div>
      </div>
    </Link>
  );
}

function openAgentChat() {
  window.dispatchEvent(new Event("openAgentChat"));
}

export default function Home() {
  const { isConnected } = useAccount();
  const { userNatilleras } = useFactory();
  const { balance } = useCUSDBalance();

  return (
    <div className="px-4 py-4 space-y-6">
      {/* ── SECTION A: Agent Hero (always visible) ───────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-celo-light text-celo-dark px-3 py-1 rounded-full mb-4">
          🤖 ERC-8004 Agent #12
        </span>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Natillera On-Chain</h1>
        <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
          Ahorro rotativo autónomo en Celo Mainnet
        </p>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={openAgentChat}
            className="w-full max-w-xs bg-celo-green text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-sm hover:bg-celo-dark transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="8" width="16" height="12" rx="3" />
              <circle cx="9" cy="14" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="15" cy="14" r="1.5" fill="currentColor" stroke="none" />
              <path d="M10 18h4" />
              <path d="M12 2v4" />
              <path d="M8 6h8" />
            </svg>
            Hablar con el Agente
          </button>

          {!isConnected && (
            <div className="w-full max-w-xs">
              <ConnectWallet />
            </div>
          )}
        </div>
      </section>

      {/* ── Wallet info bar (only when connected) ────────────────── */}
      {isConnected && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Balance: <span className="font-semibold text-gray-800">${Number(balance).toFixed(2)} cUSD</span></p>
          <ConnectWallet />
        </div>
      )}

      {/* ── My Natilleras (only when connected + has natilleras) ── */}
      {isConnected && userNatilleras.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">Mis Natilleras</h2>
          <div className="space-y-3">
            {userNatilleras.map((addr) => (
              <NatilleraCard key={addr} address={addr} />
            ))}
          </div>
        </section>
      )}

      {isConnected && userNatilleras.length === 0 && (
        <div className="bg-white rounded-2xl p-5 text-center border border-gray-100">
          <p className="text-sm text-gray-500 mb-3">No tienes natilleras activas</p>
          <Link
            to="/create"
            className="inline-block bg-celo-green text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-celo-dark transition"
          >
            Crear tu primera Natillera
          </Link>
        </div>
      )}

      {/* ── SECTION B: Live Natillera Dashboard (always visible) ── */}
      <section>
        <h2 className="text-base font-bold text-gray-900 mb-1">Natilleras Activas en Celo</h2>
        <p className="text-xs text-gray-400 mb-3">Datos en vivo de los contratos</p>
        <div className="grid grid-cols-2 gap-3">
          {KNOWN_NATILLERAS.map((n) => (
            <NatilleraStatCard key={n.address} address={n.address} fallbackName={n.name} />
          ))}
        </div>
      </section>
    </div>
  );
}
