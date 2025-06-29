import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/* ── Supabase ── */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function Lib() {
  const location = useLocation();
  const navigate = useNavigate();

  /* ── Auth & basic state ── */
  const [session, setSession] = useState(null);
  const [sessionChecked, setChecked] = useState(false);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Upload‑PDF modal ── */
  const [show, setShow] = useState(false);
  const [uTitle, setUTitle] = useState("");
  const [uAuth, setUAuth] = useState("");
  const [uFile, setUFile] = useState(null);
  const [busy, setBusy] = useState(false);

  /* ── Add‑offline modal ── */
  const [showOffline, setShowOffline] = useState(false);
  const [oTitle, setOTitle] = useState("");
  const [oAuth, setOAuth] = useState("");
  const [oPages, setOPages] = useState("");
  const [oCover, setOCover] = useState(null);      // 🆕 optional cover
  const [offlineBusy, setOfflineBusy] = useState(false);

  /* ── Actions modal for an offline book ── */
  const [actionsOpen, setActionsOpen] = useState(false);     // 🆕
  const [actionBook, setActionBook] = useState(null);      // 🆕
  const [noteText, setNoteText] = useState("");        // 🆕
  const [notePage, setNotePage] = useState("");        // 🆕
  const [progPage, setProgPage] = useState("");        // 🆕
  const [actionBusy, setActionBusy] = useState(false);     // 🆕

  /* ── Auth listener ── */
  useEffect(() => {
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_e, sess) => { setSession(sess); setChecked(true); });
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChecked(true); });
    return () => subscription.unsubscribe();
  }, []);

  /* ── Fetch books ── */
  useEffect(() => {
    if (!sessionChecked) return;
    if (!session) { navigate("/login", { replace: true }); return; }

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("books")
        .select("id, title, author, total_pages, pdf_url, thumb_data")   // unchanged
        .eq("user_id", session.user.id)
        .order("id");
      if (!error) setBooks(data || []);
      setLoading(false);
    })();
  }, [sessionChecked, session, navigate]);

  /* ── Upload PDF book (unchanged) ── */
  const handleUpload = async () => {
    if (!uFile || !uTitle || !uAuth || !session) return;
    setBusy(true);
    try {
      const buf = await uFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const page = await pdf.getPage(1);
      const total = pdf.numPages;
      const vp = page.getViewport({ scale: 0.5 });
      const cvs = document.createElement("canvas");
      cvs.width = vp.width; cvs.height = vp.height;
      await page.render({ canvasContext: cvs.getContext("2d"), viewport: vp }).promise;
      const thumb = cvs.toDataURL("image/png");

      const path = `${session.user.id}/${Date.now()}_${uFile.name}`;
      const { error: upErr } = await supabase.storage.from("books-pdf").upload(path, uFile);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("books-pdf").getPublicUrl(path);

      const { data: ins } = await supabase
        .from("books")
        .insert({
          user_id: session.user.id, title: uTitle, author: uAuth,
          total_pages: total, pdf_url: publicUrl, thumb_data: thumb
        }).select().single();
      setBooks(p => [...p, ins]);
      setShow(false); setUTitle(""); setUAuth(""); setUFile(null);
    } catch (e) { alert("Upload failed: " + e.message); } finally { setBusy(false); }
  };

  /* 🆕 helper: file → Base64 */
  const toBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
  });

  /* ── Add offline book ── */
  const handleAddOffline = async () => {
    if (!oTitle || !oAuth || !oPages || !session) return;
    setOfflineBusy(true);
    try {
      const thumb = oCover ? await toBase64(oCover) : null;   // 🆕 cover → thumb_data
      const { data: ins } = await supabase
        .from("books")
        .insert({
          user_id: session.user.id,
          title: oTitle, author: oAuth, total_pages: oPages,
          pdf_url: null, thumb_data: thumb
        }).select().single();
      setBooks(p => [...p, ins]);
      setShowOffline(false);
      setOTitle(""); setOAuth(""); setOPages(""); setOCover(null);
    } catch (e) { alert("Failed: " + e.message); } finally { setOfflineBusy(false); }
  };

  /* 🆕 Add note */
  const saveNote = async () => {
    if (!noteText || !notePage) return;
    setActionBusy(true);
    try {
      await supabase.from("notes").insert({
        user_id: session.user.id, book_id: actionBook.id,
        content: noteText, page_no: notePage
      });
      setNoteText(""); setNotePage("");
      alert("Note added!");
    } finally { setActionBusy(false); }
  };

  /* 🆕 Record progress */
  const saveProgress = async () => {
    const totalPages = actionBook.total_pages;
    const percent = (parseInt(progPage) / totalPages) * 100;
    if (!progPage) return;
    setActionBusy(true);
    try {
      await supabase.from("progress").upsert({
        user_id: session.user.id,
        book_id: String(actionBook.id), // Your schema uses TEXT
        page_no: progPage,
        percent: percent,
      });
    } finally { setActionBusy(false); }
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-[#09080f] via-[#120d23] to-[#080613] text-white">
      {/* ---------- NAVBAR (unchanged) ---------- */}
      <nav className="relative z-10">
        {/* ...same navbar code as before... */}
        <div className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 border border-white/20 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="text-xl font-light tracking-wider" style={{ fontFamily: "Playfair Display, serif" }}>BOOKMISE</span>
          </div>
          <div className="flex items-center space-x-8">
            {["Home", "Library", "Notes", "Social", "Profile"].map(item => {
              const path = item === "Home" ? "/home" : `/${item.toLowerCase()}`;
              const active = location.pathname === path;
              return (
                <Link key={item} to={path}
                  className={`relative font-light text-sm tracking-wide group transition ${active ? "text-white font-medium" : "text-white/80 hover:text-white"}`}>
                  {item}
                  <span className={`absolute -bottom-1 left-0 h-px bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-500 ${active ? "w-full" : "w-0 group-hover:w-full"}`} />
                </Link>);
            })}
            {session && <span className="text-xs text-white/60">{session.user.email}</span>}
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-8" />
      </nav>

      {/* ---------- HEADER ---------- */}
      <section className="pt-28 pb-6 px-6 flex items-center flex-wrap gap-4">
        <h2 className="text-3xl font-medium" style={{ fontFamily: "Playfair Display, serif" }}>Your Library</h2>
        <div className="ml-auto flex gap-3">
          <button onClick={() => setShow(true)}
            className="px-4 py-2 rounded text-sm border border-white/40 bg-transparent hover:bg-white/10 transition">Upload PDF</button>
          <button onClick={() => setShowOffline(true)}
            className="px-4 py-2 rounded text-sm border border-white/40 bg-transparent hover:bg-white/10 transition">Add Offline Book</button>
        </div>
      </section>

      {/* ---------- MODALS ---------- */}
      {show && (
        <Modal title="Add New PDF Book" onClose={() => setShow(false)}>
          <Input placeholder="Title" val={uTitle} on={setUTitle} />
          <Input placeholder="Author" val={uAuth} on={setUAuth} />
          <input type="file" accept="application/pdf" onChange={e => setUFile(e.target.files?.[0] || null)}
            className="text-sm text-white/80 file:mr-4 file:py-2 file:px-4 file:rounded
                     file:border-0 file:bg-white/20 file:text-white hover:file:bg-white/30"/>
          <ModalBtns okLabel="Upload" busy={busy} okDisabled={!uFile || !uTitle || !uAuth}
            onOK={handleUpload} onCancel={() => setShow(false)} />
        </Modal>
      )}

      {showOffline && (
        <Modal title="Add Offline Book" onClose={() => setShowOffline(false)}>
          <Input placeholder="Title" val={oTitle} on={setOTitle} />
          <Input placeholder="Author" val={oAuth} on={setOAuth} />
          <Input placeholder="Total Pages" type="number" val={oPages} on={setOPages} />
          {/* 🆕 optional cover */}
          <input type="file" accept="image/*" onChange={e => setOCover(e.target.files?.[0] || null)}
            className="text-sm text-white/80 file:mr-4 file:py-2 file:px-4 file:rounded
                     file:border-0 file:bg-white/20 file:text-white hover:file:bg-white/30"/>
          <ModalBtns okLabel="Save" busy={offlineBusy}
            okDisabled={!oTitle || !oAuth || !oPages} onOK={handleAddOffline}
            onCancel={() => setShowOffline(false)} />
        </Modal>
      )}

      {/* 🆕 Actions Modal */}
      {actionsOpen && (
        <Modal title={actionBook.title} onClose={() => setActionsOpen(false)}>
          <h4 className="text-sm font-semibold">Add Note</h4>
          <Input placeholder="Note text" val={noteText} on={setNoteText} />
          <Input placeholder="Page no" val={notePage} on={setNotePage} type="number" />
          <button onClick={saveNote} disabled={actionBusy || !noteText || !notePage}
            className="px-3 py-1 border border-white/40 rounded disabled:opacity-50 hover:bg-white/10 transition text-xs">
            Save Note
          </button>

          <h4 className="text-sm font-semibold mt-6">Record Progress</h4>
          <Input placeholder="Current page" val={progPage} on={setProgPage} type="number" />
          <button onClick={saveProgress} disabled={actionBusy || !progPage}
            className="mt-1 px-3 py-1 border border-white/40 rounded disabled:opacity-50 hover:bg-white/10 transition text-xs">
            Save Progress
          </button>
        </Modal>
      )}

      {/* ---------- GRID ---------- */}
      <section className="pb-20 px-6">
        {loading ? (
          <p className="text-center text-white/60 mt-10">Loading…</p>
        ) : books.length === 0 ? (
          <p className="text-center text-white/60 mt-10">No books yet.</p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map(b => (
              <div key={b.id}
                className="relative p-4 bg-white/5 rounded-lg backdrop-blur-sm hover:bg-white/10 transition group cursor-pointer"
                onClick={() => { if (!b.pdf_url) { setActionBook(b); setActionsOpen(true); } }}
              >
                {b.thumb_data ? (
                  <img src={b.thumb_data} alt={b.title}
                    className="w-full h-44 object-cover rounded-md" />
                ) : (
                  <div className="w-full h-44 bg-white/10 rounded-md flex items-center justify-center text-xs">
                    {b.pdf_url ? "PDF" : "OFFLINE"}
                  </div>
                )}
                <h3 className="mt-4 text-lg font-semibold text-white/90 group-hover:text-white line-clamp-2">
                  {b.title}
                </h3>
                <p className="text-white/60 text-sm line-clamp-1">{b.author}</p>
                {b.pdf_url && (
                  <Link to={`/reader/${b.id}`}
                    className="absolute top-2 right-2 text-xs bg-blue-500/70 hover:bg-blue-600 px-2 py-1 rounded">
                    Open
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>);
}

/* ---------- helpers ---------- */
const Input = ({ val, on, ...p }) => (
  <input {...p} value={val} onChange={e => on(e.target.value)}
    className="w-full bg-white/20 p-2 rounded text-white placeholder-white/60" />
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
    <button onClick={onOK} disabled={busy || okDisabled}
      className="px-3 py-1 border border-white/40 rounded disabled:opacity-50 hover:bg-white/10 transition">
      {busy ? "Saving…" : okLabel}
    </button>
  </div>
);
