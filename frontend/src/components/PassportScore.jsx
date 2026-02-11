import { useAccount } from "wagmi";
import { useState, useEffect } from "react";

// TODO: Replace with your actual Passport.xyz credentials from https://developer.passport.xyz
const PASSPORT_API_KEY = import.meta.env.VITE_PASSPORT_API_KEY || "";
const PASSPORT_SCORER_ID = import.meta.env.VITE_PASSPORT_SCORER_ID || "";
const PASSPORT_API_URL = "https://api.passport.xyz";

export function usePassportScore() {
  const { address } = useAccount();
  const [score, setScore] = useState(null);
  const [passingScore, setPassingScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!address || !PASSPORT_API_KEY || !PASSPORT_SCORER_ID) {
      setScore(null);
      setPassingScore(null);
      return;
    }

    let cancelled = false;
    async function fetchScore() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${PASSPORT_API_URL}/v2/stamps/${PASSPORT_SCORER_ID}/score/${address}`,
          { headers: { "X-API-KEY": PASSPORT_API_KEY } }
        );
        if (!res.ok) throw new Error(`Passport API error: ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setScore(data.score ? Number(data.score) : 0);
          setPassingScore(data.passing_score ?? null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchScore();
    return () => { cancelled = true; };
  }, [address]);

  return { score, passingScore, loading, error, isConfigured: !!(PASSPORT_API_KEY && PASSPORT_SCORER_ID) };
}

export default function PassportScore() {
  const { score, passingScore, loading, error, isConfigured } = usePassportScore();
  const { isConnected } = useAccount();

  if (!isConnected) return null;

  // Show setup hint when API keys are missing
  if (!isConfigured) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
        <p className="font-semibold mb-1">Passport.xyz</p>
        <p>
          Configura VITE_PASSPORT_API_KEY y VITE_PASSPORT_SCORER_ID en tu .env para
          verificar identidad de miembros.
        </p>
        {/* TODO: Integrate PassportScoreWidget from @human.tech/passport-embed when embed API key is available */}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
        <div className="h-3 bg-gray-200 rounded w-16"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">
        <p className="font-semibold">Passport.xyz Error</p>
        <p>{error}</p>
      </div>
    );
  }

  if (score === null) return null;

  return (
    <div className={`border rounded-xl p-3 ${passingScore ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-700">Passport Score</p>
          <p className={`text-lg font-bold ${passingScore ? "text-green-700" : "text-yellow-700"}`}>
            {score.toFixed(1)}
          </p>
        </div>
        <div className="text-right">
          {passingScore ? (
            <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Verificado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Score bajo
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
