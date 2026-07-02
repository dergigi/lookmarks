// NOTE: This file should normally not be modified unless you are adding a new provider.
// To add new routes, edit the AppRouter.tsx file.

import { createHead, UnheadProvider } from '@unhead/react/client';
import { InferSeoMetaPlugin } from '@unhead/addons';
import { Suspense } from 'react';
import { EventStoreProvider } from 'applesauce-react/providers';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from '@/components/AppProvider';
import { AppConfig } from '@/contexts/AppContext';
import { eventStore } from '@/nostr/core';
import AppRouter from './AppRouter';

const head = createHead({
  plugins: [
    InferSeoMetaPlugin(),
  ],
});

const defaultConfig: AppConfig = {
  theme: "light",
};

export function App() {
  return (
    <UnheadProvider head={head}>
      <AppProvider storageKey="lookmarks:app-config" defaultConfig={defaultConfig}>
        <EventStoreProvider eventStore={eventStore}>
          <TooltipProvider>
            <Toaster />
            <Suspense>
              <AppRouter />
            </Suspense>
          </TooltipProvider>
        </EventStoreProvider>
      </AppProvider>
    </UnheadProvider>
  );
}

export default App;
