/* ---------------- Reader.jsx ---------------- */
import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import { createClient } from "@supabase/supabase-js";

/* pdf-worker */
pdfjs.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

/* handwritten font */
const indie =
  "@import url('https://fonts.googleapis.com/css2?family=Indie+Flower&display=swap');";

/* supabase */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function Reader() {
  const { id } = useParams();

  /* ---------- PDF ---------- */
  const [url, setUrl] = useState(null);
  const [num, setNum] = useState(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const first = useRef(true);

  /* ---------- notes ---------- */
  const [notes, setNotes] = useState([]);
  const [deckOpen, setDeck] = useState(false);
  const [hover, setHover] = useState(false);
  const [expandedId, setExp] = useState(null);
  const [adding, setAdd] = useState(false);
  const [txt, setTxt] = useState("");
  const [editId, setEdit] = useState(null);
  const [editTxt, setEditTxt] = useState("");

  /* ---------- initial load ---------- */
  useEffect(() => {
    (async () => {
      const sess = (await supabase.auth.getSession()).data.session;
      if (!sess) return;
      const uid = sess.user.id;

      const { data: row } = await supabase
        .from("books")
        .select("pdf_url")
        .eq("id", Number(id))
        .single();
      setUrl(row?.pdf_url);

      const { data: prog } = await supabase
        .from("progress")
        .select("page_no")
        .eq("user_id", uid)
        .eq("book_id", id)
        .maybeSingle();
      if (prog?.page_no) setPage(prog.page_no);

      loadNotes(uid, prog?.page_no || 1);
    })();
  }, [id]);

  const loadNotes = async (uid, p) => {
    const { data } = await supabase
      .from("notes")
      .select("id, content")
      .eq("user_id", uid)
      .eq("book_id", id)
      .eq("page_no", p)
      .order("created_at");
    setNotes(data || []);
    setDeck(false);
    setExp(null);
    setEdit(null);
  };

  /* ---------- save progress ---------- */
  useEffect(() => {
    if (!num) return;
    if (first.current) {
      first.current = false;
      return;
    }
    (async () => {
      const uid = (await supabase.auth.getSession()).data.session.user.id;
      await supabase.from("progress").upsert(
        {
          user_id: uid,
          book_id: id,
          page_no: page,
          percent: (page / num) * 100,
          update_at: new Date()
        },
        { onConflict: "user_id, book_id" }
      );
      loadNotes(uid, page);
    })();
  }, [page, num]);

  /* ---------- CRUD ---------- */
  const addNote = async () => {
    if (!txt.trim()) return;
    const uid = (await supabase.auth.getSession()).data.session.user.id;
    await supabase.from("notes").insert({
      user_id: uid,
      book_id: id,
      page_no: page,
      content: txt.trim(),
      created_at: new Date()
    });
    setTxt("");
    setAdd(false);
    loadNotes(uid, page);
  };

  const saveEdit = async () => {
    if (!editTxt.trim()) return;
    await supabase
      .from("notes")
      .update({ content: editTxt.trim(), updated_at: new Date() })
      .eq("id", editId);
    const uid = (await supabase.auth.getSession()).data.session.user.id;
    loadNotes(uid, page);
  };

  const delNote = async (nid) => {
    await supabase.from("notes").delete().eq("id", nid);
    const uid = (await supabase.auth.getSession()).data.session.user.id;
    loadNotes(uid, page);
  };

  /* ---------- UI helpers ---------- */
  const next = () => setPage((p) => Math.min(p + 1, num));
  const prev = () => setPage((p) => Math.max(p - 1, 1));
  const zoomIn = () => setZoom((z) => z + 0.1);
  const zoomOut = () => setZoom((z) => Math.max(0.5, z - 0.1));
  const pct = num ? (page / num) * 100 : 0;

  const offset = (i) => (hover ? i * 16 : i * 12);
  const sheets = notes.slice(0, 5);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#09080f] via-[#120d23] to-[#080613] text-white">
      {/* progress bar */}
      <div className="h-1 w-full bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-[width] duration-700 ease-in-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* header */}
      <header className="backdrop-blur-md bg-white/10 flex items-center justify-between px-6 py-3">
        <Link to="/library" className="text-sky-300 hover:text-sky-100">← Library</Link>
        <div className="flex items-center gap-4">
          <button onClick={prev} disabled={page<=1} className="text-sky-300 hover:text-sky-100">‹</button>
          <span>{page}/{num || "…"}</span>
          <button onClick={next} disabled={page>=num} className="text-sky-300 hover:text-sky-100">›</button>
          <button onClick={zoomOut} className="text-sky-300 hover:text-sky-100">−</button>
          <button onClick={zoomIn}  className="text-sky-300 hover:text-sky-100">+</button>
          <button onClick={()=>setAdd(true)}
            className="px-2 py-1 border border-sky-300 text-sky-300 hover:bg-sky-300/20 rounded">
            + Note
          </button>
        </div>
      </header>

      {/* viewer */}
      <main className="flex-1 flex items-center justify-center overflow-auto relative">
        {url ? (
          <Document key={url} file={url} onLoadSuccess={({ numPages }) => setNum(numPages)}>
            <Page pageNumber={page} scale={zoom} />
          </Document>
        ) : (
          <p className="mt-10">Loading…</p>
        )}

        {/* collapsed deck */}
        {!deckOpen && sheets.length > 0 && (
          <div
            className="absolute left-8 top-24 select-none cursor-pointer"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onClick={() => setDeck(true)}
            style={{
              perspective: "800px",
              transform: "rotateX(4deg) rotateY(-6deg)",
              transition: "transform .4s"
            }}
          >
            {sheets.map((n, i) => (
              <div
                key={n.id}
                style={{
                  transform: `translate(${offset(i)}px, ${offset(i)}px)`,
                  width: 150,
                  height: 95,
                  zIndex: i
                }}
                className="absolute bg-[#fffce1] border border-yellow-300 rounded-lg drop-shadow-[0_0_6px_rgba(255,255,255,.35)]"
              >
                {i === sheets.length - 1 && (
                  <div className="p-2 text-[12px] text-gray-800" style={{ fontFamily: "Indie Flower, cursive" }}>
                    {notes.length === 1 ? n.content.slice(0, 32) : `${notes.length} Notes ▾`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* list view */}
        {deckOpen && (
          <div className="absolute left-8 top-24 flex flex-col gap-2 z-40">
            {notes.map((n) => (
              <div
                key={n.id}
                className="bg-[#fffce1] rounded-lg p-3 text-gray-800 drop-shadow-[0_0_6px_rgba(255,255,255,.35)] hover:scale-[1.03] transition"
                style={{ fontFamily: "Indie Flower, cursive" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setExp(expandedId === n.id ? null : n.id);
                  setEdit(null);
                }}
              >
                {expandedId === n.id ? (
                  editId === n.id ? (
                    <>
                      <textarea
                        rows={3}
                        value={editTxt}
                        onChange={(e) => setEditTxt(e.target.value)}
                        className="w-full bg-white/40 p-1 rounded resize-none"
                      />
                      <div className="flex justify-end text-xs gap-2 mt-1">
                        <button onClick={() => setEdit(null)} className="text-sky-400 hover:text-sky-200">Cancel</button>
                        <button onClick={saveEdit} className="text-green-400 hover:text-green-200 font-bold">Save</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="whitespace-pre-wrap">{n.content}</div>
                      <div className="flex justify-end text-xs gap-2 mt-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEdit(n.id); setEditTxt(n.content); }}
                          className="text-green-400 hover:text-green-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); delNote(n.id); }}
                          className="text-red-400 hover:text-red-200"
                        >
                          Delete
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setExp(null); }}
                          className="text-sky-400 hover:text-sky-200"
                        >
                          Close
                        </button>
                      </div>
                    </>
                  )
                ) : (
                  <div>{n.content.slice(0, 28)}…</div>
                )}
              </div>
            ))}
            <button
              onClick={() => { setDeck(false); setExp(null); }}
              className="text-xs text-sky-300 hover:text-sky-100 mt-1"
            >
              ✕ Collapse
            </button>
          </div>
        )}
      </main>

      {/* add-note modal */}
      {adding && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-md p-6 rounded w-80 space-y-4">
            <h4 className="font-medium">Add Note (page {page})</h4>
            <textarea
              rows={4}
              value={txt}
              onChange={(e) => setTxt(e.target.value)}
              className="w-full bg-white/20 p-2 rounded"
              style={{ fontFamily: "Indie Flower, cursive" }}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setAdd(false)}
                className="px-3 py-1 bg-gray-400/40 hover:bg-gray-400/60 rounded text-gray-200">Cancel</button>
              <button onClick={addNote}
                className="px-3 py-1 bg-sky-500 hover:bg-sky-600 rounded text-white font-medium">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Indie Flower font */}
      <style jsx>{indie}</style>
    </div>
  );
}
