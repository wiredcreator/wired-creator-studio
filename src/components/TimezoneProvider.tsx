'use client';

import { createContext, useContext, ReactNode } from 'react';

interface TimezoneContextValue {
  timezone: string;
}

const TimezoneContext = createContext<TimezoneContextValue>({
  timezone: 'America/New_York',
});

export function TimezoneProvider({
  timezone,
  children,
}: {
  timezone: string;
  children: ReactNode;
}) {
  return (
    <TimezoneContext.Provider value={{ timezone }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezoneContext() {
  return useContext(TimezoneContext);
}
