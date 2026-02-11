import { useAccount } from "wagmi";
import { Link } from "react-router-dom";
import ConnectWallet from "../components/ConnectWallet";
import NatilleraCard from "../components/NatilleraCard";
import { useFactory, useCUSDBalance } from "../hooks/useNatillera";

export default function Home() {
  const { isConnected } = useAccount();
  const { userNatilleras, allNatilleras } = useFactory();
  const { balance } = useCUSDBalance();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <div className="w-20 h-20 bg-celo-light rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-celo-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Natillera On-Chain</h1>
        <p className="text-gray-500 mb-8 max-w-xs">
          Grupos de ahorro rotativo en la blockchain de Celo. Transparente, seguro y descentralizado.
        </p>
        <ConnectWallet />
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Mis Natilleras</h2>
          <p className="text-sm text-gray-500">Balance: ${Number(balance).toFixed(2)} cUSD</p>
        </div>
        <ConnectWallet />
      </div>

      {userNatilleras.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 mb-6">
          <p className="text-gray-500 mb-4">No tienes natilleras activas</p>
          <Link
            to="/create"
            className="inline-block bg-celo-green text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-celo-dark transition"
          >
            Crear tu primera Natillera
          </Link>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {userNatilleras.map((addr) => (
            <NatilleraCard key={addr} address={addr} />
          ))}
        </div>
      )}

      {allNatilleras.length > 0 && (
        <>
          <h3 className="text-base font-semibold text-gray-700 mb-3">Todas las Natilleras</h3>
          <div className="space-y-3">
            {allNatilleras.map((addr) => (
              <NatilleraCard key={addr} address={addr} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
