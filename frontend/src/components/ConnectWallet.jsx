import { useAccount, useConnect, useDisconnect } from "wagmi";
import { isMiniPay } from "../utils/wagmiConfig";

export default function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
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
    <button
      onClick={() => connect({ connector: connectors[0] })}
      className="bg-celo-green text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-celo-dark transition"
    >
      Conectar Wallet
    </button>
  );
}
