import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "./utils/wagmiConfig";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import CreateNatillera from "./pages/CreateNatillera";
import NatilleraDetail from "./pages/NatilleraDetail";
import History from "./pages/History";

const queryClient = new QueryClient();

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<CreateNatillera />} />
              <Route path="/natillera/:address" element={<NatilleraDetail />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
