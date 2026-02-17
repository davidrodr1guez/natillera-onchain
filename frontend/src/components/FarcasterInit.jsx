import { useEffect } from "react";
import sdk from "@farcaster/frame-sdk";

export default function FarcasterInit() {
  useEffect(() => {
    (async () => {
      await sdk.context;
      sdk.actions.ready();
    })();
  }, []);

  return null;
}
