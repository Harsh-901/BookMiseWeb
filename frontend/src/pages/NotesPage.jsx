/* ---------------- NotesPage.jsx ---------------- */
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { useTheme } from "./ThemeContext";

/* handwritten font once */
const indie = "@import url('https://fonts.googleapis.com/css2?family=Indie+Flower&display=swap');";

/* Supabase */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function NotesPage() {
  const location = useLocation();
  const navigate  = useNavigate();

  /* auth */
  const [session, setSession] = useState(null);
  const [checked,  setChecked] = useState(false);

  /* theme (same as Profile) */
  const { isDark, toggleTheme } = useTheme();

  /* theme classes */
  const theme = {
    bg: isDark
      ? "bg-gradient-to-br from-[#09080f] via-[#120d23] to-[#080613]"
      : "bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50",
    text: isDark ? "text-white" : "text-gray-900",
    navText: isDark ? "text-white/80 hover:text-white" : "text-gray-700 hover:text-gray-900",
    navTextActive: isDark ? "text-white font-medium" : "text-gray-900 font-medium",
    border: isDark ? "border-white/20" : "border-gray-200",
    muted: isDark ? "text-white/60" : "text-gray-600",
    logo: isDark ? "text-white" : "text-gray-900",
    gradientBorder: isDark
      ? "from-transparent via-white/10 to-transparent"
      : "from-transparent via-gray-300/50 to-transparent",
    card: isDark
      ? "bg-white/10 backdrop-blur-md"
      : "bg-white/80 backdrop-blur-md shadow-xl",
  };

  /* books list */
  const [books, setBooks]   = useState([]);
  const [loading, setLoad ] = useState(true);

  /* modal */
  const [showNotes, setShowNotes] = useState(false);
  const [selBook,  setSelBook]    = useState(null);
  const [notes,    setNotes]      = useState([]);
  const [deckOpen, setDeckOpen]   = useState(false);
  const [hover,    setHover]      = useState(false);

  /* auth listener */
  useEffect(()=>{
    const { data:{subscription} } =
      supabase.auth.onAuthStateChange((_e,sess)=>{ setSession(sess); setChecked(true); });
    supabase.auth.getSession().then(({data})=>{ setSession(data.session); setChecked(true); });
    return ()=>subscription.unsubscribe();
  },[]);

  /* fetch books */
  useEffect(()=>{
    if(!checked) return;
    if(!session){ navigate("/login",{replace:true}); return; }

    (async()=>{
      setLoad(true);
      const { data } = await supabase
        .from("books")
        .select("id,title,author,total_pages,pdf_url,thumb_data")
        .eq("user_id",session.user.id)
        .order("id");
      setBooks(data||[]);
      setLoad(false);
    })();
  },[checked,session,navigate]);

  /* load notes for selected book */
  const openNotes = async (book) => {
    setSelBook(book);
    setDeckOpen(false);
    setHover(false);
    const { data } = await supabase
      .from("notes")
      .select("id,page_no,content,created_at")
      .eq("user_id", session.user.id)
      .eq("book_id", book.id)
      .order("page_no,created_at");
    setNotes(data || []);
    setShowNotes(true);
  };

  /* deck helpers */
  const offset = (i) => (hover ? i * 16 : i * 12);
  const sheets = notes.slice(0, 5);

  return (
  <div className={`min-h-screen overflow-y-auto ${theme.bg} ${theme.text} transition-all duration-300`}>

    {/* -------- Navbar -------- */}
    <nav className="relative z-10">
      <div className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 border ${theme.border} rounded flex items-center justify-center`}>
            <span className={`${theme.logo} font-bold text-sm`}>M</span>
          </div>
          <span className={`text-xl font-light tracking-wider ${theme.logo}`} style={{fontFamily:"Playfair Display, serif"}}>BOOKMISE</span>
        </div>
        <div className="flex items-center space-x-8">
          {["Home","Library","Notes","Social","Profile"].map(item=>{
            const path=item==="Home"?"/home":`/${item.toLowerCase()}`;
            const active=location.pathname===path;
            return(
              <Link key={item} to={path}
                className={`relative font-light text-sm tracking-wide group transition ${active?theme.navTextActive:theme.navText}`}>
                {item}
                <span className={`absolute -bottom-1 left-0 h-px bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-500 ${active?"w-full":"w-0 group-hover:w-full"}`}/>
              </Link>);
          })}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-all duration-300 ${isDark?'bg-white/10 hover:bg-white/20':'bg-gray-200 hover:bg-gray-300'}`}
            title={`Switch to ${isDark?'light':'dark'} theme`}>
            {isDark ? (
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707 8.001 8.001 0 1017.293 13.293z"/>
              </svg>
            )}
          </button>

          {/* {session && <span className={`text-xs ${theme.muted}`}>{session.user.email}</span>} */}
        </div>
      </div>
      <div className={`h-px bg-gradient-to-r ${theme.gradientBorder} mx-8`}/>
    </nav>

    {/* -------- Header -------- */}
    <section className="pt-5 pb-6 px-6">
      <h2 className="text-3xl font-medium" style={{fontFamily:"Playfair Display, serif"}}>Your Notes</h2>
      <p className={`text-sm mt-1 ${theme.muted}`}>Click a book to view its notes</p>
    </section>

    {/* -------- Books grid -------- */}
    <section className="pb-20 px-6">
      {loading ? (
        <p className={`text-center mt-10 ${theme.muted}`}>Loading…</p>
      ) : books.length===0 ? (
        <p className={`text-center mt-10 ${theme.muted}`}>No books found.</p>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {books.map(b=>(
            <div key={b.id}
              className={`relative p-4 rounded-lg backdrop-blur-sm hover:bg-white/10 transition group cursor-pointer ${isDark?'bg-white/5':'bg-gray-200/60 hover:bg-gray-300/60'}`}
              onClick={()=>openNotes(b)}
            >
              {b.thumb_data ? (
                <img src={b.thumb_data} alt={b.title} className="w-full h-44 object-cover rounded-md"/>
              ) : (
                <div className={`w-full h-44 rounded-md flex items-center justify-center text-xs ${isDark?'bg-white/10':'bg-gray-300/50'}`}>
                  {b.pdf_url?"PDF":"OFFLINE"}
                </div>
              )}
              <h3 className={`mt-4 text-lg font-semibold line-clamp-2 ${isDark?'text-white/90 group-hover:text-white':'text-gray-900 group-hover:text-gray-800'}`}>{b.title}</h3>
              <p className={`text-sm line-clamp-1 ${theme.muted}`}>{b.author}</p>
            </div>
          ))}
        </div>
      )}
    </section>

    {/* -------- Notes modal -------- */}
    {showNotes && (
      <div className={`fixed inset-0 ${isDark?'bg-black/70':'bg-gray-800/40'} flex items-center justify-center z-40`}>
        <div className={`relative ${theme.card} rounded-lg p-6 max-w-lg w-full space-y-4 border ${theme.border}`}>
          <button onClick={()=>setShowNotes(false)}
            className={`absolute top-2 right-2 ${theme.muted} hover:${isDark?'text-white':'text-gray-900'}`}>✕</button>
          <h3 className="text-xl font-medium text-center">{selBook.title}</h3>

          {/* collapsed deck */}
          {!deckOpen && sheets.length>0 && (
            <div className="mx-auto mt-4 select-none cursor-pointer relative"
              onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onClick={()=>setDeckOpen(true)}
              style={{width:160,height:110,perspective:"800px",transform:"rotateX(4deg) rotateY(-6deg)",transition:"transform .4s"}} >
              {sheets.map((n,i)=>(
                <div key={n.id}
                  style={{transform:`translate(${offset(i)}px,${offset(i)}px)`,width:160,height:110,zIndex:i}}
                  className="absolute bg-[#fffce1] border border-yellow-300 rounded-lg drop-shadow-[0_0_6px_rgba(255,255,255,.35)]">
                  {i===sheets.length-1 && (
                    <div className="p-2 text-[12px] text-gray-800" style={{fontFamily:"Indie Flower, cursive"}}>
                      {notes.length===1 ? n.content.slice(0,40) : `${notes.length} Notes ▾`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* list view */}
          {deckOpen && (
            <div className="scrollbar-thin max-h-72 overflow-y-auto space-y-3">
              {notes.map(n=>(
                <div key={n.id}
                  className="bg-[#fffce1] rounded-lg p-3 text-gray-800 drop-shadow-[0_0_6px_rgba(255,255,255,.35)] max-w-[30vw]"
                  style={{fontFamily:"Indie Flower, cursive"}}>
                  <p className="text-xs text-gray-500 mb-1">Page {n.page_no}</p>
                  <pre className="whitespace-pre-wrap text-[15px] leading-snug">{n.content}</pre>
                </div>
              ))}
              <button onClick={()=>setDeckOpen(false)}
                className="block mx-auto text-xs text-sky-300 hover:text-sky-100 mt-1">✕ Collapse</button>
            </div>
          )}
        </div>
        <style jsx>{indie}</style>
      </div>
    )}
  </div>);
}
