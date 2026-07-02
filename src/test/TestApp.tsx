import { createHead, UnheadProvider } from '@unhead/react/client';
import { BrowserRouter } from 'react-router-dom';
import { EventStoreProvider } from 'applesauce-react/providers';
import { AppProvider } from '@/components/AppProvider';
import { AppConfig } from '@/contexts/AppContext';
import { eventStore } from '@/nostr/core';

interface TestAppProps {
  children: React.ReactNode;
}

export function TestApp({ children }: TestAppProps) {
  const head = createHead();

  const defaultConfig: AppConfig = {
    theme: 'light',
  };

  return (
    <UnheadProvider head={head}>
      <AppProvider storageKey='test-app-config' defaultConfig={defaultConfig}>
        <EventStoreProvider eventStore={eventStore}>
          <BrowserRouter>
            {children}
          </BrowserRouter>
        </EventStoreProvider>
      </AppProvider>
    </UnheadProvider>
  );
}

export default TestApp;
