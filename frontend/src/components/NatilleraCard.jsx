import { Link } from "react-router-dom";
import { useNatilleraDetail } from "../hooks/useNatillera";

const STATUS_COLORS = {
  0: "bg-yellow-100 text-yellow-700",
  1: "bg-green-100 text-green-700",
  2: "bg-gray-100 text-gray-600",
  3: "bg-red-100 text-red-600",
};

export default function NatilleraCard({ address }) {
  const detail = useNatilleraDetail(address);

  return (
    <Link
      to={`/natillera/${address}`}
      className="block bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-base">{detail.name || "Cargando..."}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[detail.status]}`}>
          {detail.statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-500">Amount</p>
          <p className="text-sm font-semibold text-gray-800">${detail.contributionAmount}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-500">Members</p>
          <p className="text-sm font-semibold text-gray-800">
            {detail.memberCount}/{detail.maxMembers}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-500">Frequency</p>
          <p className="text-sm font-semibold text-gray-800">{detail.frequencyLabel}</p>
        </div>
      </div>
    </Link>
  );
}
