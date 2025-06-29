/* ---------------- Lib.jsx ---------------- */
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";
import { useTheme } from "./ThemeContext";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/* Supabase */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function Lib() {
  const location  = useLocation();
  const navigate  = useNavigate();

  /* Auth & books */
  const [session,setSession]        = useState(null);
  const [checked,setChecked]        = useState(false);
  const [books,setBooks]            = useState([]);
  const [loading,setLoading]        = useState(true);

  /* Theme */
  const { isDark, toggleTheme } = useTheme();

  const theme={
    bg:isDark
      ?"bg-gradient-to-br from-[#09080f] via-[#120d23] to-[#080613]"
      :"bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50",
    text:isDark?"text-white":"text-gray-900",
    navText:isDark?"text-white/80 hover:text-white":"text-gray-700 hover:text-gray-900",
    navActive:isDark?"text-white font-medium":"text-gray-900 font-medium",
    logo:isDark?"text-white":"text-gray-900",
    border:isDark?"border-white/20":"border-gray-200",
    gradientBorder:isDark
      ?"from-transparent via-white/10 to-transparent"
      :"from-transparent via-gray-300/50 to-transparent",
    card:isDark?"bg-white/5":"bg-gray-200/60 hover:bg-gray-300/60",
    thumb:isDark?"bg-white/10":"bg-gray-300/50",
    muted:isDark?"text-white/60":"text-gray-600"
  };

  /* Upload / offline modal states (unchanged) */
  const [show,setShow] = useState(false);
  const [uTitle,setUTitle] = useState(""); const [uAuth,setUAuth]=useState(""); const [uFile,setUFile]=useState(null); const [busy,setBusy]=useState(false);
  const [showOff,setShowOff]=useState(false); const [oTitle,setOTitle]=useState(""); const [oAuth,setOAuth]=useState(""); const [oPages,setOPages]=useState(""); const [oCover,setOCover]=useState(null); const [offBusy,setOffBusy]=useState(false);
  const [actOpen,setActOpen]=useState(false); const [actBook,setActBook]=useState(null); const [noteTxt,setNoteTxt]=useState(""); const [notePg,setNotePg]=useState(""); const [progPg,setProgPg]=useState(""); const [actBusy,setActBusy]=useState(false);
  const [delBusy,setDelBusy]=useState(false);

  /* Auth listener */
  useEffect(()=>{
    const {data:{subscription}} =
      supabase.auth.onAuthStateChange((_e,s)=>{ setSession(s); setChecked(true); });
    supabase.auth.getSession().then(({data})=>{ setSession(data.session); setChecked(true); });
    return ()=>subscription.unsubscribe();
  },[]);

  /* Fetch books */
  useEffect(()=>{
    if(!checked) return;
    if(!session){ navigate("/login",{replace:true}); return;}
    (async()=>{
      setLoading(true);
      const {data}=await supabase
        .from("books")
        .select("id,title,author,total_pages,pdf_url,thumb_data")
        .eq("user_id",session.user.id).order("id");
      setBooks(data||[]);
      setLoading(false);
    })();
  },[checked,session,navigate]);

  /* --- helpers / upload / add offline / notes / progress / delete (UNCHANGED) --- */
  /* ...  (all the functions you already have) ... */
  /* keep original code for handleUpload / handleAddOffline / saveNote / saveProgress / handleDelete */

  /* code omitted for brevity – keep your existing versions */

  /* JSX */
  return(
  <div className={`min-h-screen overflow-y-auto ${theme.bg} ${theme.text} transition-all duration-300`}>

    {/* Navbar */}
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
                className={`relative font-light text-sm tracking-wide group transition ${active?theme.navActive:theme.navText}`}>
                {item}
                <span className={`absolute -bottom-1 left-0 h-px bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-500 ${active?"w-full":"w-0 group-hover:w-full"}`}/>
              </Link>);
          })}

          {/* Theme toggle */}
          <button onClick={toggleTheme}
            className={`p-2 rounded-lg transition-all duration-300 ${isDark?'bg-white/10 hover:bg-white/20':'bg-gray-200 hover:bg-gray-300'}`}>
            {isDark ? (
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" clipRule="evenodd"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707 8.001 8.001 0 1017.293 13.293z"/>
              </svg>
            )}
          </button>

          {session && <span className={`text-xs ${theme.muted}`}>{session.user.email}</span>}
        </div>
      </div>
      <div className={`h-px bg-gradient-to-r ${theme.gradientBorder} mx-8`}/>
    </nav>

    {/* Header */}
    <section className="pt-10 pb-6 px-6 flex items-center flex-wrap gap-4">
      <h2 className="text-3xl font-medium" style={{fontFamily:"Playfair Display, serif"}}>Your Library</h2>
      <div className="ml-auto flex gap-3">
        <button onClick={()=>setShow(true)}
          className="px-4 py-2 rounded text-sm border border-white/40 bg-transparent hover:bg-white/10 transition">Upload PDF</button>
        <button onClick={()=>setShowOff(true)}
          className="px-4 py-2 rounded text-sm border border-white/40 bg-transparent hover:bg-white/10 transition">Add Offline Book</button>
      </div>
    </section>

    {/* Grid */}
    <section className="pb-20 px-6">
      {loading ? (
        <p className={`text-center mt-10 ${theme.muted}`}>Loading…</p>
      ) : books.length===0 ? (
        <p className={`text-center mt-10 ${theme.muted}`}>No books yet.</p>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {books.map(b=>(
            <div key={b.id}
              className={`relative p-4 rounded-lg backdrop-blur-sm hover:bg-white/10 transition group cursor-pointer ${theme.card}`}
              onClick={()=>{ if(!b.pdf_url){ setActBook(b); setActOpen(true);} }}>
              {b.thumb_data ? (
                <img src={b.thumb_data} alt={b.title} className="w-full h-44 object-cover rounded-md"/>
              ) : (
                <div className={`w-full h-44 flex items-center justify-center text-xs rounded-md ${theme.thumb}`}>
                  {b.pdf_url?"PDF":"OFFLINE"}
                </div>
              )}
              <h3 className={`mt-4 text-lg font-semibold line-clamp-2 ${isDark?"text-white/90 group-hover:text-white":"text-gray-900 group-hover:text-gray-800"}`}>{b.title}</h3>
              <p className={`text-sm line-clamp-1 ${theme.muted}`}>{b.author}</p>

              {b.pdf_url && (
                <Link to={`/reader/${b.id}`} onClick={e=>e.stopPropagation()}
                  className="absolute top-2 right-12 text-xs bg-blue-500/70 hover:bg-blue-600 px-2 py-1 rounded">
                  Open
                </Link>
              )}
              <button onClick={e=>handleDelete(b,e)}
                disabled={delBusy}
                className="absolute top-2 right-2 text-xs bg-red-500/70 hover:bg-red-600 px-2 py-1 rounded disabled:opacity-50">
                {delBusy?"…":"Del"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>

    {/* --- Keep your existing modals (Upload, Offline, Actions) unchanged --- */}
  </div>);
}

/* helpers (unchanged) */
const Input = ({val,on,...p})=>(
  <input {...p} value={val} onChange={e=>on(e.target.value)}
    className="w-full bg-white/20 p-2 rounded text-white placeholder-white/60"/>
);
const Modal = ({title,children,onClose})=>(
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-30">
    <div className="bg-white/10 backdrop-blur-md p-6 rounded-lg w-80 space-y-4 relative">
      <button onClick={onClose}
        className="absolute top-2 right-2 text-white/70 hover:text-white">✕</button>
      <h3 className="text-xl font-medium text-center">{title}</h3>
      {children}
    </div>
  </div>
);
const ModalBtns = ({busy,okDisabled,okLabel,onOK,onCancel})=>(
  <div className="flex justify-end space-x-3 pt-2">
    <button onClick={onCancel}
      className="px-3 py-1 bg-white/20 rounded hover:bg-white/30 transition">Cancel</button>
    <button onClick={onOK} disabled={busy||okDisabled}
      className="px-3 py-1 border border-white/40 rounded disabled:opacity-50 hover:bg-white/10 transition">
      {busy?"Saving…":okLabel}
    </button>
  </div>
);
