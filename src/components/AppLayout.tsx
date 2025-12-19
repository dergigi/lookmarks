import { Outlet } from 'react-router-dom';
import { AppFooter } from '@/components/AppFooter';

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
      <AppFooter />
    </div>
  );
}


