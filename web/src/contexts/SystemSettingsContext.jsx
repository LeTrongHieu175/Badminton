import { createContext, useContext, useEffect, useState } from 'react';
import { getSystemSettings } from '../services/settingsService';
import {
  getDefaultSystemSettings,
  getStoredSystemSettings,
  setRuntimeSystemSettings
} from '../utils/systemSettings';

const SystemSettingsContext = createContext({
  settings: getDefaultSystemSettings(),
  isLoading: true,
  error: null,
  refreshSettings: async () => {},
  applySettings: () => {}
});

export function SystemSettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => getStoredSystemSettings());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  async function refreshSettings() {
    setIsLoading(true);
    try {
      const nextSettings = await getSystemSettings();
      const appliedSettings = setRuntimeSystemSettings(nextSettings);
      setSettings(appliedSettings);
      setError(null);
      return appliedSettings;
    } catch (nextError) {
      setError(nextError);
      throw nextError;
    } finally {
      setIsLoading(false);
    }
  }

  function applySettings(nextSettings) {
    const appliedSettings = setRuntimeSystemSettings(nextSettings);
    setSettings(appliedSettings);
    return appliedSettings;
  }

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      setIsLoading(true);
      try {
        const nextSettings = await getSystemSettings();
        if (!isMounted) {
          return;
        }

        const appliedSettings = setRuntimeSystemSettings(nextSettings);
        setSettings(appliedSettings);
        setError(null);
      } catch (nextError) {
        if (isMounted) {
          setError(nextError);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SystemSettingsContext.Provider
      value={{
        settings,
        isLoading,
        error,
        refreshSettings,
        applySettings
      }}
    >
      {children}
    </SystemSettingsContext.Provider>
  );
}

export function useSystemSettings() {
  return useContext(SystemSettingsContext);
}
