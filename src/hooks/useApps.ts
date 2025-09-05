import { useContext } from 'react';

// project-imports
import AppsContext from '../contexts/AppsContext';

// ==============================|| HOOKS - APPS ||============================== //

export default function useApps() {
  const context = useContext(AppsContext);

  if (!context) throw new Error('useApps must be used inside AppsProvider');

  return context;
}
