import { createConfig, http } from "wagmi";
import { celo, celoAlfajores } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { waapConnector } from "./waapConnector";

export const config = createConfig({
  chains: [celo, celoAlfajores],
  connectors: [injected(), waapConnector()],
  transports: {
    [celo.id]: http("https://fern.celo.org"),
    [celoAlfajores.id]: http("https://alfajores-fern.celo-testnet.org"),
  },
});

export function isMiniPay() {
  return typeof window !== "undefined" && window.ethereum?.isMiniPay;
}
