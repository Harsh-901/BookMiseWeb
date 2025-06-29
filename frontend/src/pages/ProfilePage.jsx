/* ---------------- ProfilePage.jsx ---------------- */
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { useTheme } from "./ThemeContext";


/* Supabase */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function ProfilePage() {
  const location = useLocation();
  const navigate  = useNavigate();

  /* auth */
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  /* theme */
  const { isDark, toggleTheme } = useTheme();


  /* stats */
  const [bookCount, setBookCount] = useState(0);
  const [pagesRead, setPagesRead] = useState(0);
  const [hoursRead, setHoursRead] = useState(0);
  const [streak,    setStreak]    = useState(0);

  /* fetch user + stats */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { navigate("/login", { replace: true }); return; }
      setSession(data.session);
      fetchStats(data.session.user.id);
      setLoading(false);
    });
  }, [navigate]);

  async function fetchStats(uid) {
    /* Books count */
    const { count: bc } = await supabase
      .from("books")
      .select("*", { count: "exact", head: true })
      .eq("user_id", uid);
    setBookCount(bc || 0);

    /* Pages read */
    const { data: prog } = await supabase
      .from("progress")
      .select("page_no")
      .eq("user_id", uid);
    const totalPages = (prog || []).reduce((acc, r) => acc + (r.page_no || 0), 0);
    setPagesRead(totalPages);
    setHoursRead((totalPages / 60).toFixed(1)); // ≈1 min per page

    /* Streak (consecutive days with progress) */
    const days = (prog || []).map(r => new Date(r.update_at || r.created_at).toDateString());
    const uniq = Array.from(new Set(days)).sort().reverse();
    let streakCount = 0;
    let today = new Date().toDateString();
    for (let i = 0; i < uniq.length; i++) {
      const ref = new Date(today);
      ref.setDate(ref.getDate() - i);
      if (uniq[i] === ref.toDateString()) streakCount++;
      else break;
    }
    setStreak(streakCount);
  }

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-[#09080f] via-[#120d23] to-[#080613]' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50'}`}>
      <div className="flex items-center space-x-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className={`text-lg ${isDark ? 'text-white/60' : 'text-gray-600'}`}>Loading profile…</p>
      </div>
    </div>
  );

  const name = session.user.user_metadata?.name || "User";

  const themeClasses = {
    bg: isDark 
      ? 'bg-gradient-to-br from-[#09080f] via-[#120d23] to-[#080613]' 
      : 'bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50',
    text: isDark ? 'text-white' : 'text-gray-900',
    cardBg: isDark ? 'bg-white/10 backdrop-blur-md' : 'bg-white/80 backdrop-blur-md shadow-xl',
    navText: isDark ? 'text-white/80 hover:text-white' : 'text-gray-700 hover:text-gray-900',
    navTextActive: isDark ? 'text-white font-medium' : 'text-gray-900 font-medium',
    border: isDark ? 'border-white/20' : 'border-gray-200',
    mutedText: isDark ? 'text-white/60' : 'text-gray-600',
    logoText: isDark ? 'text-white' : 'text-gray-900',
    gradientBorder: isDark ? 'from-transparent via-white/10 to-transparent' : 'from-transparent via-gray-300/50 to-transparent'
  };

  return (
    <div className={`min-h-screen overflow-y-auto ${themeClasses.bg} ${themeClasses.text} transition-all duration-300`}>

      {/* ---------- Navbar ---------- */}
      <nav className="relative z-10">
        <div className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 border ${themeClasses.border} rounded flex items-center justify-center`}>
              <span className={`${themeClasses.logoText} font-bold text-sm`}>M</span>
            </div>
            <span className={`text-xl font-light tracking-wider ${themeClasses.logoText}`} style={{fontFamily:"Playfair Display, serif"}}>
              BOOKMISE
            </span>
          </div>
          <div className="flex items-center space-x-8">
            {["Home","Library","Notes","Social","Profile"].map(item=>{
              const path=item==="Home"?"/home":`/${item.toLowerCase()}`;
              const active=location.pathname===path;
              return(
                <Link key={item} to={path}
                  className={`relative font-light text-sm tracking-wide group transition ${active ? themeClasses.navTextActive : themeClasses.navText}`}>
                  {item}
                  <span className={`absolute -bottom-1 left-0 h-px bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-500 ${active?"w-full":"w-0 group-hover:w-full"}`}/>
                </Link>);
            })}
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-all duration-300 ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-200 hover:bg-gray-300'}`}
              title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            >
              {isDark ? (
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className={`h-px bg-gradient-to-r ${themeClasses.gradientBorder} mx-8`}/>
      </nav>

      {/* ---------- Profile Card ---------- */}
      <div className="flex justify-center pt-8 pb-12 px-4">
        <div className={`${themeClasses.cardBg} p-5 rounded-2xl w-full max-w-md space-y-8 border ${themeClasses.border} transition-all duration-300`}>

          {/* Avatar + name */}
          <div className="flex flex-col items-center space-y-4">
            <div className={`relative w-24 h-24 rounded-full flex items-center justify-center overflow-hidden ${isDark ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-2 border-white/20' : 'bg-gradient-to-br from-blue-100 to-purple-100 border-2 border-gray-200'} transition-all duration-300`}>
              <span className="text-4xl filter drop-shadow-sm">👤</span>
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-full"></div>
            </div>
            <div className="text-center">
              {/* <h2 className={`text-xl font-semibold ${themeClasses.text} mb-1`}>{name}</h2> */}
              <p className={`text-sm ${themeClasses.mutedText}`}>{session.user.email}</p>
            </div>
          </div>

          <hr className={`border-t ${themeClasses.border}`}/>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6">
            <StatBox label="Books" value={bookCount} isDark={isDark} icon="📚"/>
            <StatBox label="Pages" value={pagesRead} isDark={isDark} icon="📄"/>
            <StatBox label="Hours" value={hoursRead} isDark={isDark} icon="⏰"/>
            <StatBox label="Streak" value={streak} isDark={isDark} icon="🔥"/>
          </div>

          <button
            onClick={() => supabase.auth.signOut().then(()=>window.location.reload())}
            className={`w-full py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${isDark 
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/25' 
              : 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-red-500/25'
            }`}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */
const StatBox = ({label, value, isDark, icon}) => (
  <div className={`text-center p-4 rounded-xl transition-all duration-300 ${isDark 
    ? 'bg-white/5 hover:bg-white/10 border border-white/10' 
    : 'bg-white/50 hover:bg-white/70 border border-gray-200'
  }`}>
    <div className="text-2xl mb-2">{icon}</div>
    <h4 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-1`}>{value}</h4>
    <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-600'}`}>{label}</p>
  </div>
);