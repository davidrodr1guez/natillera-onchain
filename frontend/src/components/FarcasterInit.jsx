import { useEffect } from "react";
import { useConnect } from "wagmi";
import sdk from "@farcaster/frame-sdk";

export default function FarcasterInit() {
  const { connect, connectors } = useConnect();

  useEffect(() => {
    (async () => {
      const context = await sdk.context;
      sdk.actions.ready();

      // Auto-connect Farcaster frame wallet if running inside Farcaster
      if (context?.user?.fid) {
        const frameConnector = connectors.find((c) => c.id === "farcasterFrame");
        if (frameConnector) {
          connect({ connector: frameConnector });
        }
      }
    })();
  }, [connect, connectors]);

  return null;
}
