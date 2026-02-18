import { useParams } from "react-router-dom";
import { useAccount } from "wagmi";
import { useNatilleraDetail, useNatilleraActions, useHasContributed } from "../hooks/useNatillera";
import { parseEther } from "viem";
import { useState } from "react";
import ConnectWallet from "../components/ConnectWallet";
import PassportScore from "../components/PassportScore";

const STATUS_COLORS = {
  0: "bg-yellow-100 text-yellow-700",
  1: "bg-green-100 text-green-700",
  2: "bg-gray-100 text-gray-600",
  3: "bg-red-100 text-red-600",
};

export default function NatilleraDetail() {
  const { address: natilleraAddress } = useParams();
  const { address: userAddress, isConnected } = useAccount();
  const detail = useNatilleraDetail(natilleraAddress);
  const { approveAndJoin, approveAndContribute, forceAdvance, isPending } = useNatilleraActions(natilleraAddress);
  const hasContributed = useHasContributed(natilleraAddress, detail.roundInfo?.round, userAddress);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isMember = detail.members.some(
    (m) => m.addr?.toLowerCase() === userAddress?.toLowerCase()
  );
  const isCreator = detail.creator?.toLowerCase() === userAddress?.toLowerCase();
  const isPending_ = detail.status === 0;
  const isActive = detail.status === 1;
  const isCompleted = detail.status === 2;
  const canJoin = isPending_ && !isMember && detail.memberCount < detail.maxMembers;

  const deadline = detail.roundInfo?.deadline;
  const isPastDeadline = deadline ? Date.now() / 1000 > deadline : false;

  async function handleJoin() {
    setError("");
    setSuccess("");
    try {
      await approveAndJoin(parseEther(detail.contributionAmount));
      setSuccess("Te uniste exitosamente.");
      detail.refetch();
    } catch (err) {
      setError(err.shortMessage || err.message);
    }
  }

  async function handleContribute() {
    setError("");
    setSuccess("");
    try {
      await approveAndContribute(parseEther(detail.contributionAmount));
      setSuccess("Contribución registrada.");
      detail.refetch();
    } catch (err) {
      setError(err.shortMessage || err.message);
    }
  }

  async function handleForceAdvance() {
    setError("");
    setSuccess("");
    try {
      await forceAdvance();
      setSuccess("Round advanced.");
      detail.refetch();
    } catch (err) {
      setError(err.shortMessage || err.message);
    }
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
        <p className="text-gray-500 mb-4">Conecta tu wallet para ver los detalles</p>
        <ConnectWallet />
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{detail.name}</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[detail.status]}`}>
            {detail.statusLabel}
          </span>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <InfoCard label="Amount" value={`$${detail.contributionAmount} cUSD`} />
        <InfoCard label="Frequency" value={detail.frequencyLabel} />
        <InfoCard label="Members" value={`${detail.memberCount}/${detail.maxMembers}`} />
        <InfoCard label="Pozo total" value={`$${(Number(detail.contributionAmount) * detail.maxMembers).toFixed(2)}`} />
      </div>

      {/* Round info */}
      {isActive && detail.roundInfo && (
        <div className="bg-celo-light rounded-2xl p-4 mb-4">
          <p className="text-sm font-semibold text-celo-dark mb-2">
            Round {detail.roundInfo.round + 1} of {detail.totalRounds}
          </p>
          <p className="text-xs text-gray-600 mb-1">
            Contribuciones: {detail.roundInfo.contributions}/{detail.memberCount}
          </p>
          <p className="text-xs text-gray-600 mb-1">
            Recibe el pozo:{" "}
            <span className="font-mono">
              {detail.roundInfo.recipient?.slice(0, 6)}...{detail.roundInfo.recipient?.slice(-4)}
            </span>
            {detail.roundInfo.recipient?.toLowerCase() === userAddress?.toLowerCase() && (
              <span className="ml-1 text-celo-green font-semibold">(Eres tú!)</span>
            )}
          </p>
          <p className="text-xs text-gray-600">
            Fecha límite: {new Date(detail.roundInfo.deadline * 1000).toLocaleDateString("es", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3 mb-6">
        {canJoin && (
          <button
            onClick={handleJoin}
            disabled={isPending}
            className="w-full bg-celo-green text-white py-3 rounded-xl font-semibold text-sm hover:bg-celo-dark transition disabled:opacity-50"
          >
            {isPending ? "Procesando..." : `Unirse (Colateral: $${detail.contributionAmount} cUSD)`}
          </button>
        )}

        {isActive && isMember && !hasContributed && (
          <button
            onClick={handleContribute}
            disabled={isPending}
            className="w-full bg-celo-green text-white py-3 rounded-xl font-semibold text-sm hover:bg-celo-dark transition disabled:opacity-50"
          >
            {isPending ? "Procesando..." : `Contribuir $${detail.contributionAmount} cUSD`}
          </button>
        )}

        {isActive && hasContributed && (
          <div className="bg-green-50 text-green-700 text-sm py-3 px-4 rounded-xl text-center font-medium">
            Ya contribuiste en esta ronda
          </div>
        )}

        {isActive && isCreator && isPastDeadline && (
          <button
            onClick={handleForceAdvance}
            disabled={isPending}
            className="w-full bg-yellow-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-yellow-600 transition disabled:opacity-50"
          >
            {isPending ? "Procesando..." : "Forzar avance de ronda"}
          </button>
        )}

        {isCompleted && (
          <div className="bg-gray-100 text-gray-600 text-sm py-3 px-4 rounded-xl text-center">
            Esta natillera ha finalizado
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl mb-4">{error}</p>}
      {success && <p className="text-green-600 text-sm bg-green-50 px-4 py-2 rounded-xl mb-4">{success}</p>}

      {/* Passport.xyz identity verification */}
      <div className="mb-4">
        <PassportScore />
      </div>

      {/* Members list */}
      <h3 className="text-base font-semibold text-gray-700 mb-3">Members</h3>
      <div className="space-y-2">
        {detail.members.map((member, i) => {
          const payoutRound = Number(member.payoutRound);
          const isRecipientThisRound = isActive && detail.roundInfo && detail.payoutOrder[detail.roundInfo.round] === BigInt(i);
          return (
            <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-mono text-gray-800">
                  {member.addr?.slice(0, 6)}...{member.addr?.slice(-4)}
                  {member.addr?.toLowerCase() === userAddress?.toLowerCase() && (
                    <span className="ml-2 text-xs text-celo-green font-semibold">(Tú)</span>
                  )}
                </p>
                <p className="text-xs text-gray-400">Payout round: {payoutRound + 1}</p>
              </div>
              <div className="text-right">
                {member.hasReceivedPayout && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Recibido</span>
                )}
                {isRecipientThisRound && !member.hasReceivedPayout && (
                  <span className="text-xs bg-celo-light text-celo-dark px-2 py-0.5 rounded-full">Le toca</span>
                )}
              </div>
            </div>
          );
        })}
        {detail.members.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4">Sin miembros aún</p>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl p-3 border border-gray-100">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}
