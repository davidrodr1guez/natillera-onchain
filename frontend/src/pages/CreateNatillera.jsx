import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useFactory } from "../hooks/useNatillera";
import ConnectWallet from "../components/ConnectWallet";

export default function CreateNatillera() {
  const { isConnected } = useAccount();
  const navigate = useNavigate();
  const { createNatillera, isCreating } = useFactory();

  const [form, setForm] = useState({
    name: "",
    amount: "",
    frequency: "0",
    maxMembers: "",
  });
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Ingresa un nombre");
    if (!form.amount || Number(form.amount) <= 0) return setError("Monto debe ser mayor a 0");
    if (!form.maxMembers || Number(form.maxMembers) < 2) return setError("Mínimo 2 miembros");

    try {
      await createNatillera(form.name, form.amount, Number(form.frequency), Number(form.maxMembers));
      navigate("/");
    } catch (err) {
      setError(err.shortMessage || err.message || "Error al crear la natillera");
    }
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
        <p className="text-gray-500 mb-4">Conecta tu wallet para crear una natillera</p>
        <ConnectWallet />
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Crear Natillera</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del grupo</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Ej: Ahorro Familiar"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-celo-green focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cuota en cUSD</label>
          <input
            type="number"
            step="0.01"
            value={form.amount}
            onChange={(e) => update("amount", e.target.value)}
            placeholder="Ej: 10"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-celo-green focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">El colateral será igual a 1 cuota</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia</label>
          <select
            value={form.frequency}
            onChange={(e) => update("frequency", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-celo-green focus:border-transparent bg-white"
          >
            <option value="0">Semanal</option>
            <option value="1">Quincenal</option>
            <option value="2">Mensual</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Participantes máximos</label>
          <input
            type="number"
            min="2"
            max="20"
            value={form.maxMembers}
            onChange={(e) => update("maxMembers", e.target.value)}
            placeholder="Ej: 5"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-celo-green focus:border-transparent"
          />
        </div>

        {form.amount && form.maxMembers && Number(form.maxMembers) >= 2 && (
          <div className="bg-celo-light rounded-xl p-4">
            <p className="text-sm font-medium text-celo-dark mb-1">Resumen</p>
            <p className="text-xs text-gray-600">
              Cada miembro aporta <strong>${form.amount} cUSD</strong> de forma{" "}
              <strong>{["semanal", "quincenal", "mensual"][form.frequency]}</strong>.
            </p>
            <p className="text-xs text-gray-600">
              El pozo total por ronda será de{" "}
              <strong>${(Number(form.amount) * Number(form.maxMembers)).toFixed(2)} cUSD</strong>.
            </p>
            <p className="text-xs text-gray-600">
              La natillera durará <strong>{form.maxMembers} rondas</strong>.
            </p>
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl">{error}</p>
        )}

        <button
          type="submit"
          disabled={isCreating}
          className="w-full bg-celo-green text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-celo-dark transition disabled:opacity-50"
        >
          {isCreating ? "Creando..." : "Crear Natillera"}
        </button>
      </form>
    </div>
  );
}
