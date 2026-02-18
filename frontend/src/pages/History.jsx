import { useAccount, useChainId } from "wagmi";
import { useFactory } from "../hooks/useNatillera";
import { useEffect, useState } from "react";
import { createPublicClient, http, parseAbiItem } from "viem";
import { celo, celoAlfajores } from "viem/chains";
import ConnectWallet from "../components/ConnectWallet";

const CHAINS = { 42220: celo, 44787: celoAlfajores };
const RPC = { 42220: "https://fern.celo.org", 44787: "https://alfajores-fern.celo-testnet.org" };

export default function History() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { userNatilleras } = useFactory();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userNatilleras.length || !address) return;

    async function fetchEvents() {
      setLoading(true);
      const chain = CHAINS[chainId] || celoAlfajores;
      const client = createPublicClient({
        chain,
        transport: http(RPC[chainId]),
      });

      const allEvents = [];

      for (const natAddr of userNatilleras) {
        try {
          const contributions = await client.getLogs({
            address: natAddr,
            event: parseAbiItem("event ContributionMade(address indexed member, uint256 round, uint256 amount)"),
            fromBlock: "earliest",
            toBlock: "latest",
          });

          const payouts = await client.getLogs({
            address: natAddr,
            event: parseAbiItem("event PayoutSent(address indexed recipient, uint256 round, uint256 amount)"),
            fromBlock: "earliest",
            toBlock: "latest",
          });

          for (const log of contributions) {
            allEvents.push({
              type: "contribution",
              natillera: natAddr,
              member: log.args.member,
              round: Number(log.args.round),
              amount: log.args.amount,
              blockNumber: log.blockNumber,
              txHash: log.transactionHash,
            });
          }

          for (const log of payouts) {
            allEvents.push({
              type: "payout",
              natillera: natAddr,
              member: log.args.recipient,
              round: Number(log.args.round),
              amount: log.args.amount,
              blockNumber: log.blockNumber,
              txHash: log.transactionHash,
            });
          }
        } catch {
          // Skip if logs can't be fetched
        }
      }

      allEvents.sort((a, b) => Number(b.blockNumber - a.blockNumber));
      setEvents(allEvents);
      setLoading(false);
    }

    fetchEvents();
  }, [userNatilleras, address, chainId]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
        <p className="text-gray-500 mb-4">Conecta tu wallet para ver el historial</p>
        <ConnectWallet />
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4">History</h2>

      {loading && <p className="text-gray-400 text-sm text-center py-8">Cargando eventos...</p>}

      {!loading && events.length === 0 && (
        <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
          <p className="text-gray-500">No hay transacciones aún</p>
        </div>
      )}

      <div className="space-y-3">
        {events.map((ev, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  ev.type === "payout" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                }`}
              >
                {ev.type === "payout" ? "Pago recibido" : "Contribución"}
              </span>
              <span className="text-xs text-gray-400">Round {ev.round + 1}</span>
            </div>
            <p className="text-sm font-mono text-gray-600">
              {ev.member?.slice(0, 8)}...{ev.member?.slice(-6)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Natillera: {ev.natillera?.slice(0, 8)}...{ev.natillera?.slice(-4)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
