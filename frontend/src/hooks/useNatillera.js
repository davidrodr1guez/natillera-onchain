import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { parseEther, formatEther } from "viem";
import { NATILLERA_ABI, CUSD_ABI, CUSD_ADDRESS, FACTORY_ABI, FACTORY_ADDRESS } from "../utils/contracts";

const STATUS_MAP = ["Pendiente", "Activa", "Completada", "Cancelada"];
const FREQ_MAP = ["Semanal", "Quincenal", "Mensual"];

export function useFactory() {
  const chainId = useChainId();
  const factoryAddress = FACTORY_ADDRESS[chainId];
  const { address } = useAccount();

  const { data: count } = useReadContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: "getNatilleraCount",
  });

  const { data: allNatilleras, refetch: refetchAll } = useReadContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: "getAllNatilleras",
  });

  const { data: userNatilleras, refetch: refetchUser } = useReadContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: "getUserNatilleras",
    args: [address],
    query: { enabled: !!address },
  });

  const { writeContractAsync, data: txHash, isPending: isCreating } = useWriteContract();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  async function createNatillera(name, amount, frequency, maxMembers) {
    return writeContractAsync({
      address: factoryAddress,
      abi: FACTORY_ABI,
      functionName: "createNatillera",
      args: [name, parseEther(amount), frequency, BigInt(maxMembers)],
    });
  }

  return {
    count: count ? Number(count) : 0,
    allNatilleras: allNatilleras || [],
    userNatilleras: userNatilleras || [],
    createNatillera,
    isCreating: isCreating || isConfirming,
    refetchAll,
    refetchUser,
  };
}

export function useNatilleraDetail(address) {
  const natilleraAddress = address;

  const { data: results, refetch } = useReadContracts({
    contracts: [
      { address: natilleraAddress, abi: NATILLERA_ABI, functionName: "name" },
      { address: natilleraAddress, abi: NATILLERA_ABI, functionName: "contributionAmount" },
      { address: natilleraAddress, abi: NATILLERA_ABI, functionName: "frequency" },
      { address: natilleraAddress, abi: NATILLERA_ABI, functionName: "maxMembers" },
      { address: natilleraAddress, abi: NATILLERA_ABI, functionName: "creator" },
      { address: natilleraAddress, abi: NATILLERA_ABI, functionName: "status" },
      { address: natilleraAddress, abi: NATILLERA_ABI, functionName: "getMemberCount" },
      { address: natilleraAddress, abi: NATILLERA_ABI, functionName: "getMembers" },
      { address: natilleraAddress, abi: NATILLERA_ABI, functionName: "getPayoutOrder" },
      { address: natilleraAddress, abi: NATILLERA_ABI, functionName: "totalRounds" },
    ],
    query: { enabled: !!natilleraAddress },
  });

  const r = (i) => results?.[i]?.result;

  const statusNum = r(5) !== undefined ? Number(r(5)) : 0;
  const isActive = statusNum === 1;

  const { data: roundInfo, refetch: refetchRound } = useReadContract({
    address: natilleraAddress,
    abi: NATILLERA_ABI,
    functionName: "getRoundInfo",
    query: { enabled: !!natilleraAddress && isActive },
  });

  return {
    name: r(0) || "",
    contributionAmount: r(1) ? formatEther(r(1)) : "0",
    contributionAmountRaw: r(1) || 0n,
    frequency: r(2) !== undefined ? Number(r(2)) : 0,
    frequencyLabel: r(2) !== undefined ? FREQ_MAP[Number(r(2))] : "",
    maxMembers: r(3) ? Number(r(3)) : 0,
    creator: r(4) || "",
    status: statusNum,
    statusLabel: STATUS_MAP[statusNum] || "Desconocido",
    memberCount: r(6) ? Number(r(6)) : 0,
    members: r(7) || [],
    payoutOrder: r(8) || [],
    totalRounds: r(9) ? Number(r(9)) : 0,
    roundInfo: roundInfo
      ? {
          round: Number(roundInfo[0]),
          startTime: Number(roundInfo[1]),
          deadline: Number(roundInfo[2]),
          contributions: Number(roundInfo[3]),
          recipient: roundInfo[4],
        }
      : null,
    refetch: () => { refetch(); refetchRound(); },
  };
}

export function useNatilleraActions(natilleraAddress) {
  const chainId = useChainId();
  const cUSDAddr = CUSD_ADDRESS[chainId];

  const { writeContractAsync, isPending } = useWriteContract();

  async function approveAndJoin(amount) {
    await writeContractAsync({
      address: cUSDAddr,
      abi: CUSD_ABI,
      functionName: "approve",
      args: [natilleraAddress, amount],
    });
    return writeContractAsync({
      address: natilleraAddress,
      abi: NATILLERA_ABI,
      functionName: "join",
    });
  }

  async function approveAndContribute(amount) {
    await writeContractAsync({
      address: cUSDAddr,
      abi: CUSD_ABI,
      functionName: "approve",
      args: [natilleraAddress, amount],
    });
    return writeContractAsync({
      address: natilleraAddress,
      abi: NATILLERA_ABI,
      functionName: "contribute",
    });
  }

  async function forceAdvance() {
    return writeContractAsync({
      address: natilleraAddress,
      abi: NATILLERA_ABI,
      functionName: "forceAdvanceRound",
    });
  }

  return { approveAndJoin, approveAndContribute, forceAdvance, isPending };
}

export function useCUSDBalance() {
  const { address } = useAccount();
  const chainId = useChainId();
  const cUSDAddr = CUSD_ADDRESS[chainId];

  const { data, refetch } = useReadContract({
    address: cUSDAddr,
    abi: CUSD_ABI,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: !!address },
  });

  return {
    balance: data ? formatEther(data) : "0",
    balanceRaw: data || 0n,
    refetch,
  };
}

export function useHasContributed(natilleraAddress, round, memberAddress) {
  const { data } = useReadContract({
    address: natilleraAddress,
    abi: NATILLERA_ABI,
    functionName: "hasContributedInRound",
    args: [memberAddress, BigInt(round || 0)],
    query: { enabled: !!natilleraAddress && !!memberAddress && round !== undefined },
  });
  return data || false;
}
