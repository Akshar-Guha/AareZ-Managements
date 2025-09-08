import { createContext, useContext, useState } from 'react';

type LogContextType = {
  logs: string[];
  addLog: (log: string) => void;
};

const LogContext = createContext<LogContextType | undefined>(undefined);

export function LogProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (log: string) => {
    setLogs((prevLogs) => [...prevLogs, log]);
  };

  return (
    <LogContext.Provider value={{ logs, addLog }}>
      {children}
    </LogContext.Provider>
  );
}

export function useLog() {
  const context = useContext(LogContext);
  if (context === undefined) {
    throw new Error('useLog must be used within a LogProvider');
  }
  return context;
}
