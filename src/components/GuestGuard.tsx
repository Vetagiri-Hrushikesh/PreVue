import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import useAuth from '../hooks/useAuth';
import Loader from './Loader';

interface GuestGuardProps {
  children: React.ReactNode;
}

const GuestGuard: React.FC<GuestGuardProps> = ({ children }) => {
  const { isLoggedIn, isInitialized } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (isInitialized && isLoggedIn) {
      // @ts-ignore - navigation type issue
      navigation.navigate('Home');
    }
  }, [isLoggedIn, isInitialized, navigation]);

  // Show loading while checking authentication
  if (!isInitialized) {
    return <Loader />;
  }

  // Don't render auth content if already logged in
  if (isLoggedIn) {
    return null;
  }

  return <>{children}</>;
};

export default GuestGuard;
