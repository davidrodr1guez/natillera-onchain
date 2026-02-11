import { useAccount, useConnect, useDisconnect } from "wagmi";
import { isMiniPay } from "../utils/wagmiConfig";
import { useState } from "react";

export default function ConnectWallet() {
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [showOptions, setShowOptions] = useState(false);

  const injectedConnector = connectors.find((c) => c.id === "injected");
  const waapConnector = connectors.find((c) => c.id === "waap");
  const isWaaP = connector?.id === "waap";

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        {isWaaP && (
          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">
            WaaP
          </span>
        )}
        <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg font-mono">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        {!isMiniPay() && (
          <button
            onClick={() => disconnect()}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Salir
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {!showOptions ? (
        <button
          onClick={() => setShowOptions(true)}
          className="bg-celo-green text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-celo-dark transition"
        >
          Conectar Wallet
        </button>
      ) : (
        <div className="flex flex-col gap-2 min-w-[200px]">
          {/* MetaMask / Injected wallet */}
          {injectedConnector && (
            <button
              onClick={() => {
                connect({ connector: injectedConnector });
                setShowOptions(false);
              }}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-800 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
              </svg>
              {isMiniPay() ? "MiniPay" : "MetaMask / Wallet"}
            </button>
          )}

          {/* Human.Tech WaaP */}
          {waapConnector && (
            <button
              onClick={() => {
                connect({ connector: waapConnector });
                setShowOptions(false);
              }}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 transition"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
              </svg>
              Human.Tech WaaP
            </button>
          )}

          <button
            onClick={() => setShowOptions(false)}
            className="text-xs text-gray-400 hover:text-gray-600 text-center"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
