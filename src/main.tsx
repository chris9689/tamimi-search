import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { ConfigProvider } from './context/ConfigContext';
import { RequestLogProvider } from './context/RequestLogContext';
import { PersonaProvider } from './context/PersonaContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <RequestLogProvider>
          <PersonaProvider>
            <App />
          </PersonaProvider>
        </RequestLogProvider>
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>,
);
