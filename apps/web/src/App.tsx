import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MarketingHome } from './pages/MarketingHome';
import { RiderPage } from './pages/RiderPage';
import { DriverPage } from './pages/DriverPage';
import { DualViewPage } from './pages/DualViewPage';
import { HistoryPage } from './pages/HistoryPage';
import { LoginPage } from './pages/LoginPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MarketingHome />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/rider" element={<RiderPage />} />
          <Route path="/driver" element={<DriverPage />} />
          <Route path="/dual" element={<DualViewPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
