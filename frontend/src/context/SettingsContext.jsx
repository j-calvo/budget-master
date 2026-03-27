import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    defaultCurrency: 'USD',
    language: 'en-US',
    theme: 'light'
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
      if (res.data.language) i18n.changeLanguage(res.data.language);
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (newSettings) => {
    try {
      const res = await api.put('/settings', newSettings);
      setSettings(res.data);
      if (res.data.language) i18n.changeLanguage(res.data.language);
      return true;
    } catch (err) {
      console.error('Failed to update settings', err);
      return false;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
