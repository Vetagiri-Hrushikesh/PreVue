import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import useAuth from '../hooks/useAuth';
import Loader from './Loader';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isLoggedIn, isInitialized } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (isInitialized && !isLoggedIn) {
      // @ts-ignore - navigation type issue
      navigation.navigate('Login');
    }
  }, [isLoggedIn, isInitialized, navigation]);

  // Show loading while checking authentication
  if (!isInitialized) {
    return <Loader />;
  }

  // Don't render protected content if not logged in
  if (!isLoggedIn) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
