/* ---------------- Lib.jsx ---------------- */
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";
import { useTheme } from "./ThemeContext";
import {Sun, Moon} from "lucide-react"

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/* ── Supabase ─────────────────────────────────────────────────────────── */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* helper: turn File → base64 ------------------------------------------------ */
const fileToBase64 = (file) =>
  new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });

export default function Lib() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  /* ── auth + books ───────────────────────────────────────────────────── */
  const [session, setSession]   = useState(null);
  const [checked, setChecked]   = useState(false);
  const [books,   setBooks]     = useState([]);
  const [loading, setLoading]   = useState(true);

  /* ── UI state for three different modals ────────────────────────────── */
  const [showPDF,   setShowPDF]   = useState(false);
  const [uTitle,    setUTitle]    = useState("");
  const [uAuth,     setUAuth]     = useState("");
  const [uFile,     setUFile]     = useState(null);
  const [busyPDF,   setBusyPDF]   = useState(false);

  const [showOff,   setShowOff]   = useState(false);
  const [oTitle,    setOTitle]    = useState("");
  const [oAuth,     setOAuth]     = useState("");
  const [oPages,    setOPages]    = useState("");
  const [oCover,    setOCover]    = useState(null);
  const [busyOff,   setBusyOff]   = useState(false);

  const [actOpen,   setActOpen]   = useState(false);
  const [actBook,   setActBook]   = useState(null);
  const [noteTxt,   setNoteTxt]   = useState("");
  const [notePg,    setNotePg]    = useState("");
  const [progPg,    setProgPg]    = useState("");
  const [busyAct,   setBusyAct]   = useState(false);

  const [busyDel,   setBusyDel]   = useState(false);

  /* ── listen for auth ─────────────────────────────────────────────────── */
  useEffect(() => {
    const { data: { subscription }} = supabase.auth
      .onAuthStateChange((_e, sess) => { setSession(sess); setChecked(true); });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session); setChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ── fetch books when auth ready ─────────────────────────────────────── */
  useEffect(() => {
    if (!checked) return;
    if (!session) { navigate("/login", { replace: true }); return; }

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("books")
        .select("id,title,author,total_pages,pdf_url,thumb_data")
        .eq("user_id", session.user.id)
        .order("id");

      if (!error) setBooks(data || []);
      setLoading(false);
    })();
  }, [checked, session, navigate]);

  /* ╭─────────────────────────────────────────────────────────────────────┐
     │  UPLOAD PDF HANDLER                                                 │
     └─────────────────────────────────────────────────────────────────────*/
  const handleUpload = async () => {
    if (!uFile || !uTitle || !uAuth) return;
    setBusyPDF(true);
    try {
      /* 1. read first page to create thumbnail and count pages */
      const buf = await uFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const total = pdf.numPages;
      const page  = await pdf.getPage(1);
      const vp    = page.getViewport({ scale: 0.5 });
      const cvs   = document.createElement("canvas");
      cvs.width   = vp.width; cvs.height = vp.height;
      await page.render({ canvasContext: cvs.getContext("2d"), viewport: vp }).promise;
      const thumb = cvs.toDataURL("image/png");

      /* 2. upload file to storage */
      const path = `${session.user.id}/${Date.now()}_${uFile.name}`;
      const { error: upErr } = await supabase.storage
        .from("books-pdf")
        .upload(path, uFile);

      if (upErr) throw upErr;
      const { data: { publicUrl } } =
        supabase.storage.from("books-pdf").getPublicUrl(path);

      /* 3. insert DB row */
      const { data: inserted } = await supabase
        .from("books")
        .insert({
          user_id: session.user.id,
          title   : uTitle,
          author  : uAuth,
          total_pages: total,
          pdf_url : publicUrl,
          thumb_data: thumb
        })
        .select()
        .single();

      /* 4. update UI */
      setBooks(b => [...b, inserted]);
      setShowPDF(false);
      setUTitle(""); setUAuth(""); setUFile(null);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setBusyPDF(false);
    }
  };

  /* ╭─────────────────────────────────────────────────────────────────────┐
     │  ADD OFFLINE BOOK                                                   │
     └─────────────────────────────────────────────────────────────────────*/
  const handleAddOffline = async () => {
    if (!oTitle || !oAuth || !oPages) return;
    setBusyOff(true);
    try {
      const thumb = oCover ? await fileToBase64(oCover) : null;
      const { data: inserted } = await supabase
        .from("books")
        .insert({
          user_id: session.user.id,
          title  : oTitle,
          author : oAuth,
          total_pages: oPages,
          pdf_url: null,
          thumb_data: thumb
        })
        .select()
        .single();

      setBooks(b => [...b, inserted]);
      setShowOff(false);
      setOTitle(""); setOAuth(""); setOPages(""); setOCover(null);
    } catch (err) {
      alert("Save failed: " + err.message);
    } finally {
      setBusyOff(false);
    }
  };

  /* ╭─────────────────────────────────────────────────────────────────────┐
     │  SAVE NOTE + PROGRESS                                               │
     └─────────────────────────────────────────────────────────────────────*/
  const saveNote = async () => {
    if (!noteTxt || !notePg) return;
    setBusyAct(true);
    try {
      await supabase.from("notes").insert({
        user_id: session.user.id,
        book_id: actBook.id,
        page_no: notePg,
        content: noteTxt
      });
      alert("Note added!");
      setNoteTxt(""); setNotePg("");
    } finally {
      setBusyAct(false);
    }
  };

  const saveProgress = async () => {
    if (!progPg) return;
    const total = actBook.total_pages;
    const percent = (parseInt(progPg, 10) / total) * 100;
    setBusyAct(true);
    try {
      await supabase.from("progress").upsert({
        user_id: session.user.id,
        book_id: String(actBook.id),
        page_no: progPg,
        percent
      });
      setActOpen(false);
    } finally {
      setBusyAct(false);
    }
  };

  /* ╭─────────────────────────────────────────────────────────────────────┐
     │  DELETE BOOK (and linked rows + storage)                            │
     └─────────────────────────────────────────────────────────────────────*/
  const deleteBook = async (book, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this book permanently?")) return;
    setBusyDel(true);
    try {
      /* 1. remove PDF from storage if it exists */
      if (book.pdf_url) {
        const path = book.pdf_url.split("/public/books-pdf/")[1];
        if (path) await supabase.storage.from("books-pdf").remove([path]);
      }
      /* 2. clean up linked rows */
      await supabase.from("notes").delete().eq("book_id", book.id);
      await supabase.from("progress")
        .delete()
        .eq("user_id", session.user.id)
        .eq("book_id", String(book.id));
      /* 3. delete book row */
      await supabase.from("books").delete().eq("id", book.id);
      setBooks(b => b.filter(x => x.id !== book.id));
    } catch (err) {
      alert("Delete failed: " + err.message);
    } finally {
      setBusyDel(false);
    }
  };

  /* ── theme classes ----------------------------------------------------- */
  const T = {
    bg : isDark
      ? "bg-gradient-to-br from-[#09080f] via-[#120d23] to-[#080613]"
      : "bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50",
    txt: isDark ? "text-white" : "text-gray-900",
    muted: isDark ? "text-white/60" : "text-gray-600",
    border: isDark ? "border-white/20" : "border-gray-200",
    card: isDark ? "bg-white/5" : "bg-gray-200/60 hover:bg-gray-300/60",
    thumb: isDark ? "bg-white/10" : "bg-gray-300/50"
  };

  /* ────────────────────────────────────────────────────────────────────── */
  return (
    <div className={`min-h-screen overflow-y-auto ${T.bg} ${T.txt} transition-all`}>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav className="relative z-10">
        <div className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 border ${T.border} rounded flex items-center justify-center`}>
              <span className={`${isDark ? "text-white" : "text-gray-900"} font-bold text-sm`}>M</span>
            </div>
            <span className={`text-xl font-light tracking-wider ${isDark ? "text-white" : "text-gray-900"}`}
                  style={{ fontFamily: "Playfair Display, serif" }}>BOOKMISE</span>
          </div>

          {/* Links + theme switch */}
          <div className="flex items-center space-x-8">
            {["Home","Library","Notes","Social","Profile"].map(item=>{
              const path = item==="Home"?"/home":`/${item.toLowerCase()}`;
              const active = location.pathname === path;
              return (
                <Link key={item} to={path}
                      className={`relative font-light text-sm tracking-wide group transition
                                  ${active
                                    ? isDark?"text-white font-medium":"text-gray-900 font-medium"
                                    : isDark?"text-white/80 hover:text-white":"text-gray-700 hover:text-gray-900"}`}>
                  {item}
                  <span className={`absolute -bottom-1 left-0 h-px bg-gradient-to-r from-blue-400 to-purple-400
                                     transition-all duration-500 ${active?"w-full":"w-0 group-hover:w-full"}`}/>
                </Link>);
            })}

            <button onClick={toggleTheme}
              className={`p-2 rounded-lg ${isDark?"bg-white/10 hover:bg-white/20":"bg-gray-200 hover:bg-gray-300"}`}>
              {isDark
                ? <Sun  className="w-5 h-5 text-yellow-400"/>
                : <Moon className="w-5 h-5 text-gray-700"/>}
            </button>
          </div>
        </div>
        <div className={`h-px bg-gradient-to-r from-transparent ${isDark?"via-white/10":"via-gray-300/50"} to-transparent mx-8`}/>
      </nav>

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <section className="pt-10 pb-6 px-6 flex items-center flex-wrap gap-4">
        <h2 className="text-3xl font-medium" style={{ fontFamily:"Playfair Display, serif" }}>Your Library</h2>
        <div className="ml-auto flex gap-3">
          <button onClick={()=>setShowPDF(true)}
                  className="px-4 py-2 rounded text-sm border border-white/40 bg-transparent hover:bg-white/10 transition">
            Upload PDF
          </button>
          <button onClick={()=>setShowOff(true)}
                  className="px-4 py-2 rounded text-sm border border-white/40 bg-transparent hover:bg-white/10 transition">
            Add Offline Book
          </button>
        </div>
      </section>

      {/* ── GRID ─────────────────────────────────────────────────────────── */}
      <section className="pb-20 px-6">
        {loading ? (
          <p className={`text-center mt-10 ${T.muted}`}>Loading…</p>
        ) : books.length === 0 ? (
          <p className={`text-center mt-10 ${T.muted}`}>No books yet.</p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map(b => (
              <div key={b.id}
                   className={`relative p-4 rounded-lg backdrop-blur-sm transition group cursor-pointer ${T.card}`}
                   onClick={()=>{ if(!b.pdf_url){ setActBook(b); setActOpen(true);} }}>
                {b.thumb_data
                  ? <img src={b.thumb_data} alt={b.title}
                         className="w-full h-44 object-cover rounded-md"/>
                  : <div className={`w-full h-44 flex items-center justify-center text-xs rounded-md ${T.thumb}`}>
                      {b.pdf_url ? "PDF":"OFFLINE"}
                    </div>}

                <h3 className={`mt-4 text-lg font-semibold line-clamp-2 ${isDark?"text-white/90":"text-gray-900"}`}>{b.title}</h3>
                <p  className={`text-sm line-clamp-1 ${T.muted}`}>{b.author}</p>

                {b.pdf_url && (
                  <Link to={`/reader/${b.id}`} onClick={e=>e.stopPropagation()}
                        className="absolute top-2 right-12 text-xs bg-blue-500/70 hover:bg-blue-600 px-2 py-1 rounded">
                    Open
                  </Link>
                )}
                <button onClick={e=>deleteBook(b,e)} disabled={busyDel}
                        className="absolute top-2 right-2 text-xs bg-red-500/70 hover:bg-red-600 px-2 py-1 rounded disabled:opacity-50">
                  {busyDel?"…":"Del"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ╭───── Upload‑PDF modal ─────────────────────────────────────────── */}
      {showPDF && (
        <Modal title="Add New PDF Book" onClose={()=>setShowPDF(false)}>
          <Input placeholder="Title"   val={uTitle} on={setUTitle}/>
          <Input placeholder="Author"  val={uAuth}  on={setUAuth}/>
          <input type="file" accept="application/pdf" onChange={e=>setUFile(e.target.files?.[0]||null)}
                 className="text-sm text-white/80 file:mr-4 file:py-2 file:px-4 file:rounded
                            file:border-0 file:bg-white/20 file:text-white hover:file:bg-white/30"/>
          <ModalBtns okLabel="Upload" busy={busyPDF} okDisabled={!uFile||!uTitle||!uAuth}
                     onOK={handleUpload} onCancel={()=>setShowPDF(false)}/>
        </Modal>
      )}

      {/* ╭───── Add‑offline modal ────────────────────────────────────────── */}
      {showOff && (
        <Modal title="Add Offline Book" onClose={()=>setShowOff(false)}>
          <Input placeholder="Title"        val={oTitle}  on={setOTitle}/>
          <Input placeholder="Author"       val={oAuth}   on={setOAuth}/>
          <Input placeholder="Total Pages"  val={oPages}  on={setOPages} type="number"/>
          <input type="file" accept="image/*" onChange={e=>setOCover(e.target.files?.[0]||null)}
                 className="text-sm text-white/80 file:mr-4 file:py-2 file:px-4 file:rounded
                            file:border-0 file:bg-white/20 file:text-white hover:file:bg-white/30"/>
          <ModalBtns okLabel="Save" busy={busyOff} okDisabled={!oTitle||!oAuth||!oPages}
                     onOK={handleAddOffline} onCancel={()=>setShowOff(false)}/>
        </Modal>
      )}

      {/* ╭───── Actions (note/progress) modal ────────────────────────────── */}
      {actOpen && (
        <Modal title={actBook.title} onClose={()=>setActOpen(false)}>
          <h4 className="text-sm font-semibold">Add Note</h4>
          <Input placeholder="Note text" val={noteTxt} on={setNoteTxt}/>
          <Input placeholder="Page no"   val={notePg}  on={setNotePg} type="number"/>
          <button onClick={saveNote} disabled={busyAct||!noteTxt||!notePg}
                  className="px-3 py-1 border border-white/40 rounded disabled:opacity-50 hover:bg-white/10 transition text-xs">
            Save Note
          </button>

          <h4 className="text-sm font-semibold mt-6">Record Progress</h4>
          <Input placeholder="Current page" val={progPg} on={setProgPg} type="number"/>
          <button onClick={saveProgress} disabled={busyAct||!progPg}
                  className="mt-1 px-3 py-1 border border-white/40 rounded disabled:opacity-50 hover:bg-white/10 transition text-xs">
            Save Progress
          </button>
        </Modal>
      )}
    </div>
  );
}

/* ---------- tiny helpers for modal UI ---------------------------------- */
const Input = ({ val, on, ...rest }) => (
  <input {...rest} value={val} onChange={e=>on(e.target.value)}
         className="w-full bg-white/20 p-2 rounded text-white placeholder-white/60"/>
);

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-30">
    <div className="bg-white/10 backdrop-blur-md p-6 rounded-lg w-80 space-y-4 relative">
      <button onClick={onClose}
              className="absolute top-2 right-2 text-white/70 hover:text-white">✕</button>
      <h3 className="text-xl font-medium text-center">{title}</h3>
      {children}
    </div>
  </div>
);

const ModalBtns = ({ busy, okDisabled, okLabel, onOK, onCancel }) => (
  <div className="flex justify-end space-x-3 pt-2">
    <button onClick={onCancel}
            className="px-3 py-1 bg-white/20 rounded hover:bg-white/30 transition">Cancel</button>
    <button onClick={onOK} disabled={busy||okDisabled}
            className="px-3 py-1 border border-white/40 rounded disabled:opacity-50 hover:bg-white/10 transition">
      {busy ? "Saving…" : okLabel}
    </button>
  </div>
);
