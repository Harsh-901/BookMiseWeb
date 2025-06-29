import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("bookmise-theme");
    return saved ? saved === "dark" : true;
  });

  const toggleTheme = () =>
    setIsDark(prev => {
      const nv = !prev;
      localStorage.setItem("bookmise-theme", nv ? "dark" : "light");
      return nv;
    });

  /* keep tabs in sync too */
  useEffect(() => {
    const handler = e => {
      if (e.key === "bookmise-theme") setIsDark(e.newValue === "dark");
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
