import { createConnector } from "wagmi";
import { getAddress } from "viem";

/**
 * Custom wagmi connector for Human.Tech WaaP (Wallet as a Protocol).
 * Uses @human.tech/waap-sdk to provide embedded wallet login.
 */
export function waapConnector() {
  let provider = null;
  let initialized = false;

  return createConnector((config) => ({
    id: "waap",
    name: "Human.Tech WaaP",
    type: "waap",

    async setup() {
      if (initialized) return;
      try {
        const { initWaaP } = await import("@human.tech/waap-sdk");
        await initWaaP({
          config: {
            authenticationMethods: ["email", "phone", "social"],
            allowedSocials: ["google", "twitter", "discord"],
            styles: { darkMode: false },
            showSecured: true,
          },
          useStaging: false,
        });
        initialized = true;
      } catch (err) {
        console.warn("[WaaP] SDK init failed:", err.message);
      }
    },

    async connect({ chainId } = {}) {
      await this.setup();
      const p = await this.getProvider();

      // Trigger WaaP login modal
      if (window.waap?.login) {
        await window.waap.login();
      }

      const accounts = await p.request({ method: "eth_requestAccounts" });
      const currentChainId = await this.getChainId();

      if (chainId && chainId !== currentChainId) {
        const chain = await this.switchChain({ chainId });
        return {
          accounts: accounts.map((a) => getAddress(a)),
          chainId: chain.id,
        };
      }

      return {
        accounts: accounts.map((a) => getAddress(a)),
        chainId: currentChainId,
      };
    },

    async disconnect() {
      if (window.waap?.logout) {
        await window.waap.logout();
      }
      provider = null;
    },

    async getAccounts() {
      const p = await this.getProvider();
      const accounts = await p.request({ method: "eth_requestAccounts" });
      return accounts.map((a) => getAddress(a));
    },

    async getChainId() {
      const p = await this.getProvider();
      const chainIdHex = await p.request({ method: "eth_chainId" });
      return Number(chainIdHex);
    },

    async getProvider() {
      if (provider) return provider;

      // WaaP exposes an EIP-1193 provider on window.waap
      if (window.waap) {
        provider = window.waap;
        return provider;
      }

      // Fallback: wait briefly for SDK to initialize
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (window.waap) {
        provider = window.waap;
        return provider;
      }

      throw new Error("WaaP provider not available");
    },

    async isAuthorized() {
      try {
        const accounts = await this.getAccounts();
        return accounts.length > 0;
      } catch {
        return false;
      }
    },

    async switchChain({ chainId }) {
      const p = await this.getProvider();
      const chain = config.chains.find((c) => c.id === chainId);
      if (!chain) throw new Error(`Chain ${chainId} not configured`);

      await p.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });

      config.emitter.emit("change", { chainId });
      return chain;
    },

    onAccountsChanged(accounts) {
      if (accounts.length === 0) {
        config.emitter.emit("disconnect");
      } else {
        config.emitter.emit("change", {
          accounts: accounts.map((a) => getAddress(a)),
        });
      }
    },

    onChainChanged(chainId) {
      config.emitter.emit("change", { chainId: Number(chainId) });
    },

    onDisconnect() {
      config.emitter.emit("disconnect");
    },
  }));
}
