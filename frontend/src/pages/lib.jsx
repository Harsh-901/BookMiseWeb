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

  /* ─── Auth & State ─── */
  const [session, setSession] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [show, setShow] = useState(false);
  const [uTitle, setUTitle] = useState("");
  const [uAuth, setUAuth] = useState("");
  const [uFile, setUFile] = useState(null);
  const [busy, setBusy] = useState(false);

  /* ─── Auth Listener ─── */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setSessionChecked(true);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ─── Fetch books when ready ─── */
  useEffect(() => {
    if (!sessionChecked) return;
    if (!session) {
      navigate("/login", { replace: true });
      return;
    }

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("books")
        .select("id, title, author, total_pages, pdf_url, thumb_data")
        .eq("user_id", session.user.id)
        .order("id");
      if (!error) setBooks(data || []);
      setLoading(false);
    })();
  }, [sessionChecked, session, navigate]);

  /* ─── Upload Book ─── */
  const handleUpload = async () => {
    if (!uFile || !uTitle || !uAuth || !session) return;
    setBusy(true);

    try {
      const buf = await uFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const page = await pdf.getPage(1);
      const totalPages = pdf.numPages;

      const vp = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement("canvas");
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
      const thumbData = canvas.toDataURL("image/png");

      const path = `${session.user.id}/${Date.now()}_${uFile.name}`;
      const { error: uploadError } = await supabase
        .storage
        .from("books-pdf")
        .upload(path, uFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase
        .storage
        .from("books-pdf")
        .getPublicUrl(path);

      const { data: inserted, error: insertError } = await supabase
        .from("books")
        .insert({
          user_id: session.user.id,
          title: uTitle,
          author: uAuth,
          total_pages: totalPages,
          pdf_url: publicUrl,
          thumb_data: thumbData,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setBooks((prev) => [...prev, inserted]);
      setShow(false);
      setUTitle(""); setUAuth(""); setUFile(null);
    } catch (e) {
      alert("Upload failed: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-[#09080f] via-[#120d23] to-[#080613] text-white overflow-y-auto">
      {/* Navbar */}
      <nav className="relative z-10">
        <div className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 border border-white/20 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="text-xl font-light tracking-wider" style={{ fontFamily: "Playfair Display, serif" }}>
              BOOKMISE
            </span>
          </div>

          <div className="flex items-center space-x-8">
            {["Home", "Library", "Notes", "Social", "Profile"].map((item, i) => {
              const path = item === "Home" ? "/home" : `/${item.toLowerCase()}`;
              const active = location.pathname === path;
              return (
                <Link
                  key={item}
                  to={path}
                  className={`relative font-light text-sm tracking-wide group transition ${
                    active ? "text-white font-medium" : "text-white/80 hover:text-white"
                  }`}
                >
                  {item}
                  <span
                    className={`absolute -bottom-1 left-0 h-px bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-500 ${
                      active ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                </Link>
              );
            })}
            {session && (
              <span className="text-xs text-white/60">{session.user.email}</span>
            )}
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-8" />
      </nav>

      {/* Header + Upload */}
      <section className="pt-28 pb-6 px-6 flex items-center justify-between">
        <h2 className="text-3xl font-medium" style={{ fontFamily: "Playfair Display, serif" }}>
          Your Library
        </h2>
        <button
          onClick={() => setShow(true)}
          className="px-4 py-2 rounded text-sm border border-white/40 bg-transparent hover:bg-white/10 transition"
        >
          Upload Book
        </button>
      </section>

      {/* Upload Modal */}
      {show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-30">
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-lg w-80 space-y-4">
            <h3 className="text-xl font-medium text-center">Add New Book</h3>
            <input
              className="w-full bg-white/20 p-2 rounded"
              placeholder="Title"
              value={uTitle}
              onChange={(e) => setUTitle(e.target.value)}
            />
            <input
              className="w-full bg-white/20 p-2 rounded"
              placeholder="Author"
              value={uAuth}
              onChange={(e) => setUAuth(e.target.value)}
            />
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setUFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
            <div className="flex justify-end space-x-3 pt-2">
              <button onClick={() => setShow(false)} className="px-3 py-1 bg-white/20 rounded">
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={busy || !uFile || !uTitle || !uAuth}
                className="px-3 py-1 border border-white/40 rounded disabled:opacity-50 hover:bg-white/10 transition"
              >
                {busy ? "Uploading…" : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Books Grid */}
      <section className="pb-20 px-6">
        {loading ? (
          <p className="text-center text-white/60 mt-10">Loading…</p>
        ) : books.length === 0 ? (
          <p className="text-center text-white/60 mt-10">No books yet.</p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map((b) => (
              <div
                key={b.id}
                className="relative p-4 bg-white/5 rounded-lg backdrop-blur-sm hover:bg-white/10 transition group"
              >
                {b.thumb_data ? (
                  <img
                    src={b.thumb_data}
                    alt={b.title}
                    className="w-full h-44 object-cover rounded-md"
                  />
                ) : (
                  <div className="w-full h-44 bg-white/10 rounded-md flex items-center justify-center text-xs">
                    PDF
                  </div>
                )}
                <h3 className="mt-4 text-lg font-semibold text-white/90 group-hover:text-white line-clamp-2">
                  {b.title}
                </h3>
                <p className="text-white/60 text-sm line-clamp-1">{b.author}</p>
                {b.pdf_url && (
                  <Link
                    to={`/reader/${b.id}`}
                    className="absolute top-2 right-2 text-xs bg-blue-500/70 hover:bg-blue-600 px-2 py-1 rounded"
                  >
                    Open
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
