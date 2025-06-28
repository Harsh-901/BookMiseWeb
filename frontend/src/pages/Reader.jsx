import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/* ── Supabase (only for auth) ── */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Flask API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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

  /* ─── Fetch books from Flask API ─── */
  useEffect(() => {
    if (!sessionChecked) return;
    if (!session) {
      navigate("/login", { replace: true });
      return;
    }

    fetchBooks();
  }, [sessionChecked, session, navigate]);

  const fetchBooks = async () => {
    if (!session) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/books?user_id=${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        setBooks(data || []);
      } else {
        console.error('Failed to fetch books:', response.statusText);
        setBooks([]);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  /* ─── Upload Book using Flask API ─── */
  const handleUpload = async () => {
    if (!uFile || !uTitle || !uAuth || !session) return;
    setBusy(true);

    try {
      // Extract total pages using PDF.js
      const buf = await uFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const totalPages = pdf.numPages;

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', uFile);
      formData.append('title', uTitle);
      formData.append('author', uAuth);
      formData.append('total_pages', totalPages.toString());
      formData.append('user_id', session.user.id);

      // Upload to Flask backend
      const response = await fetch(`${API_BASE_URL}/api/upload-book`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadedBook = await response.json();
      
      // Add the new book to the list
      if (Array.isArray(uploadedBook) && uploadedBook.length > 0) {
        setBooks((prev) => [...prev, uploadedBook[0]]);
      } else {
        setBooks((prev) => [...prev, uploadedBook]);
      }

      // Reset form
      setShow(false);
      setUTitle("");
      setUAuth("");
      setUFile(null);
      
      // Show success message
      alert('Book uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
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
              className="w-full bg-white/20 p-2 rounded text-white placeholder-white/60"
              placeholder="Title"
              value={uTitle}
              onChange={(e) => setUTitle(e.target.value)}
            />
            <input
              className="w-full bg-white/20 p-2 rounded text-white placeholder-white/60"
              placeholder="Author"
              value={uAuth}
              onChange={(e) => setUAuth(e.target.value)}
            />
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setUFile(e.target.files?.[0] || null)}
              className="text-sm text-white/80 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-white/20 file:text-white hover:file:bg-white/30"
            />
            <div className="flex justify-end space-x-3 pt-2">
              <button 
                onClick={() => {
                  setShow(false);
                  setUTitle("");
                  setUAuth("");
                  setUFile(null);
                }} 
                className="px-3 py-1 bg-white/20 rounded hover:bg-white/30 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={busy || !uFile || !uTitle || !uAuth}
                className="px-3 py-1 border border-white/40 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition"
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
          <div className="text-center text-white/60 mt-10">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-white/60"></div>
            <p className="mt-2">Loading your library...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="text-center text-white/60 mt-10">
            <p className="text-lg">No books in your library yet.</p>
            <p className="mt-2 text-sm">Click "Upload Book" to add your first book!</p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map((book) => (
              <div
                key={book.id}
                className="relative p-4 bg-white/5 rounded-lg backdrop-blur-sm hover:bg-white/10 transition group"
              >
                {book.thumb_data ? (
                  <img
                    src={book.thumb_data}
                    alt={book.title}
                    className="w-full h-44 object-cover rounded-md"
                  />
                ) : (
                  <div className="w-full h-44 bg-white/10 rounded-md flex items-center justify-center text-xs border border-white/20">
                    <div className="text-center">
                      <div className="text-2xl mb-2">📚</div>
                      <div>PDF</div>
                    </div>
                  </div>
                )}
                <h3 className="mt-4 text-lg font-semibold text-white/90 group-hover:text-white line-clamp-2" title={book.title}>
                  {book.title}
                </h3>
                <p className="text-white/60 text-sm line-clamp-1" title={book.author}>
                  {book.author}
                </p>
                {book.total_pages && (
                  <p className="text-white/40 text-xs mt-1">
                    {book.total_pages} pages
                  </p>
                )}
                {book.pdf_url && (
                  <Link
                    to={`/reader/${book.id}`}
                    className="absolute top-2 right-2 text-xs bg-blue-500/70 hover:bg-blue-600 px-2 py-1 rounded transition-colors"
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