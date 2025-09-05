import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ===========================|| HOOKS - ASYNC STORAGE ||=========================== //

export default function useAsyncStorage<ValueType>(key: string, defaultValue: ValueType) {
  const [value, setValue] = useState<ValueType>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial value from AsyncStorage
  useEffect(() => {
    const loadValue = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const storedValue = await AsyncStorage.getItem(key);
        if (storedValue !== null) {
          setValue(JSON.parse(storedValue));
        }
      } catch (err) {
        console.error(`[useAsyncStorage] Error loading value for key "${key}":`, err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setValue(defaultValue);
      } finally {
        setIsLoading(false);
      }
    };

    loadValue();
  }, [key, defaultValue]);

  const setValueInAsyncStorage = useCallback(async (newValue: ValueType | ((currentValue: ValueType) => ValueType)) => {
    try {
      setError(null);
      const result = typeof newValue === 'function' ? (newValue as Function)(value) : newValue;
      setValue(result);
      await AsyncStorage.setItem(key, JSON.stringify(result));
    } catch (err) {
      console.error(`[useAsyncStorage] Error saving value for key "${key}":`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [key, value]);

  const removeValue = useCallback(async () => {
    try {
      setError(null);
      setValue(defaultValue);
      await AsyncStorage.removeItem(key);
    } catch (err) {
      console.error(`[useAsyncStorage] Error removing value for key "${key}":`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [key, defaultValue]);

  const clearAll = useCallback(async () => {
    try {
      setError(null);
      await AsyncStorage.clear();
    } catch (err) {
      console.error(`[useAsyncStorage] Error clearing all storage:`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  return [value, setValueInAsyncStorage, { isLoading, error, removeValue, clearAll }] as const;
}
