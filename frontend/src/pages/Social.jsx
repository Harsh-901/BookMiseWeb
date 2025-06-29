/* ---------------- Social.jsx ---------------- */
import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Link, useLocation /*, useNavigate */ } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import {
  Heart,
  MessageCircle,
  Edit3,
  Trash2,
  Send,
  Plus,
  X,
  Filter,
  Users,
  User,
  Moon,
  Sun
} from "lucide-react";
import { useTheme } from "./ThemeContext";

/* ────────────────────────── helpers ────────────────────────── */
//   1) format “x ago”
//   2) build a nested comment tree (if you later fetch threaded comments)
const formatTimeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return `${Math.floor(s / 2592000)}mo ago`;
};

const nest = (flat = []) => {
  const map = {};
  flat.forEach((c) => (map[c.id] = { ...c, replies: [] }));
  const roots = [];
  flat.forEach((c) =>
    c.parent_id ? map[c.parent_id]?.replies.push(map[c.id]) : roots.push(map[c.id])
  );
  return roots;
};

/* ────────────────────────── Supabase ───────────────────────── */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "demo-url",
  import.meta.env.VITE_SUPABASE_ANON_KEY || "demo-key"
);

/* ─────────────────────────── Social ────────────────────────── */
export default function Social() {
  /* theme + router hooks */
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  /* const navigate = useNavigate(); ← if you ever redirect on no‑session */

  /* auth session */
  const [session, setSession] = useState(null);

  /* feed state */
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mineOnly, setMineOnly] = useState(false);

  /* create‑post modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [body, setBody] = useState("");

  /* ─────────── 1) establish auth session (demo vs live) ─────────── */
  useEffect(() => {
    if (!import.meta.env.VITE_SUPABASE_URL) {
      // DEMO fallback
      setSession({ user: { id: "demo", email: "demo@example.com" } });
      setPosts(demoPosts); // demoPosts defined a bit lower
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        /* navigate("/login", { replace: true }); */ // optional auth‑gate
        return;
      }
      setSession(data.session);
    });
  }, []);

  /* ───────── 2) realtime feed subscription (live mode only) ──────── */
  useEffect(() => {
    if (!session || !import.meta.env.VITE_SUPABASE_URL) return;

    const channel = supabase
      .channel("public:posts")
      .on(
        "postgres_changes",
        { event: "*", table: "posts", schema: "public" },
        fetchFeed
      )
      .subscribe();

    fetchFeed(); // initial fetch
    return () => supabase.removeChannel(channel);
  }, [session]);

  /* fetch all posts */
  const fetchFeed = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPosts(
        data.map((p) => ({
          ...p,
          like_count: p.likes?.length ?? 0
        }))
      );
    }
    setLoading(false);
  };

  /* demo seed */
  const demoPosts = [
    {
      id: "1",
      user_id: "demo",
      username: "bookworm",
      content:
        "Just finished reading **The Seven Husbands of Evelyn Hugo** – incredible! 📚✨",
      created_at: new Date(Date.now() - 1.8e6).toISOString(),
      likes: ["demo", "user2"],
      like_count: 2,
      comments_count: 3
    },
    {
      id: "2",
      user_id: "user2",
      username: "readingaddict",
      content: "Fantasy recommendations like Brandon Sanderson?",
      created_at: new Date(Date.now() - 7.2e6).toISOString(),
      likes: ["demo"],
      like_count: 1,
      comments_count: 5
    }
  ];

  /* ──────────────── create / update / delete ───────────────── */
  const createPost = async () => {
    if (!body.trim()) return;
    const newPost = {
      id: uuidv4(),
      user_id: session.user.id,
      username: session.user.email.split("@")[0],
      content: body.trim(),
      created_at: new Date().toISOString(),
      likes: [],
      like_count: 0,
      comments_count: 0
    };

    if (import.meta.env.VITE_SUPABASE_URL) {
      await supabase.from("posts").insert({ ...newPost, likes: [] });
    } else {
      setPosts((p) => [newPost, ...p]);
    }

    setBody("");
    setModalOpen(false);
  };

  const toggleLike = async (post) => {
    const liked = post.likes.includes(session.user.id);
    const newLikes = liked
      ? post.likes.filter((uid) => uid !== session.user.id)
      : [...post.likes, session.user.id];

    setPosts((p) =>
      p.map((x) =>
        x.id === post.id ? { ...x, likes: newLikes, like_count: newLikes.length } : x
      )
    );

    if (import.meta.env.VITE_SUPABASE_URL) {
      await supabase.from("posts").update({ likes: newLikes }).eq("id", post.id);
    }
  };

  const updatePost = async (id, text) => {
    setPosts((p) => p.map((x) => (x.id === id ? { ...x, content: text } : x)));
    if (import.meta.env.VITE_SUPABASE_URL) {
      await supabase.from("posts").update({ content: text }).eq("id", id);
    }
  };

  const deletePost = async (id) => {
    setPosts((p) => p.filter((x) => x.id !== id));
    if (import.meta.env.VITE_SUPABASE_URL) {
      await supabase.from("posts").delete().eq("id", id);
    }
  };

  /* guard until we have a session */
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09080f] text-white">
        Loading…
      </div>
    );
  }

  /* filter view */
  const visible = mineOnly
    ? posts.filter((p) => p.user_id === session.user.id)
    : posts;

  /* quick color helpers */
  const C = {
    bg: isDark
      ? "bg-gradient-to-br from-navy-900 via-blue-900 to-navy-900"
      : "bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50"
  };

  /* ─────────────────────────── render ────────────────────────── */
  return (
<div className={`${C.bg} transition-colors duration-300 overflow-y-auto`}>
      {/* ── Navbar ───────────────────────────────────────────── */}
      <NavBar isDark={isDark} toggleTheme={toggleTheme} location={location} />

      {/* ── Page header ─────────────────────────────────────── */}
      <PageHeader
        isDark={isDark}
        mineOnly={mineOnly}
        setMineOnly={() => setMineOnly((v) => !v)}
      />

      {/* ── Feed ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <Spinner />
        ) : visible.length === 0 ? (
          <EmptyState isDark={isDark} />
        ) : (
          <div className="space-y-6">
            {visible.map((p, i) => (
              <div
                key={p.id}
                style={{ animationDelay: `${i * 0.1}s` }}
                className="opacity-0 animate-fade-in"
              >
                <PostCard
                  post={p}
                  session={session}
                  onLike={() => toggleLike(p)}
                  onDelete={() => deletePost(p.id)}
                  onEdit={updatePost}
                  darkMode={isDark}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-8 right-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:scale-110 hover:from-purple-600 hover:to-pink-600
                   w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition group"
      >
        <Plus className="w-6 h-6 text-white group-hover:rotate-90 transition-transform" />
      </button>

      {/* Modal */}
      {modalOpen && (
        <Modal isDark={isDark} onClose={() => setModalOpen(false)}>
          <div className="p-6">
            <h3
              className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"
                }`}
            >
              <Edit3 className="w-5 h-5" /> Share your thoughts
            </h3>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={`w-full border rounded-lg p-3 focus:ring-2 focus:ring-purple-500 resize-none ${isDark
                  ? "bg-white/10 border-white/20 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                }`}
              placeholder="What's on your mind?"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setModalOpen(false)}
                className={`px-4 py-2 rounded-lg ${isDark
                    ? "bg-white/10 text-gray-300 hover:bg-white/20"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
              >
                Cancel
              </button>
              <button
                onClick={createPost}
                disabled={!body.trim()}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg disabled:opacity-50"
              >
                <Send className="w-4 h-4 inline-block mr-1" /> Post
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* fade‑in keyframes */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────── small sub‑components ────────────────────── */

function NavBar({ isDark, toggleTheme, location }) {
  const logoTxt = isDark ? "text-white" : "text-gray-800";
  const logoBorder = isDark ? "border-white/20" : "border-gray-300";

  return (
    <nav className="px-8 py-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 border rounded flex items-center justify-center ${logoBorder}`}>
          <span className={`font-bold text-sm ${logoTxt}`}>M</span>
        </div>
        <span
          className={`text-xl font-light tracking-wider ${logoTxt}`}
          style={{ fontFamily: "Playfair Display, serif" }}
        >
          BOOKMISE
        </span>
      </div>

      <div className="flex items-center gap-8">
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-full ${isDark ? "bg-white/10 text-white" : "bg-gray-200"} `}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {["Home", "Library", "Notes", "Social", "Profile"].map((item) => {
          const path = item === "Home" ? "/home" : `/${item.toLowerCase()}`;
          const active = location.pathname === path;
          return (
            <Link
              key={item}
              to={path}
              className={`relative font-light text-sm tracking-wide group transition ${active
                  ? isDark
                    ? "text-white"
                    : "text-gray-900"
                  : isDark
                    ? "text-white/80 hover:text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
            >
              {item}
              <span
                className={`absolute -bottom-1 left-0 h-px bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-500 ${active ? "w-full" : "w-0 group-hover:w-full"
                  }`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function PageHeader({ isDark, mineOnly, setMineOnly }) {
  return (
    <header
      className={`sticky top-0 z-30 backdrop-blur-xl ${isDark ? "bg-navy-900/20 border-white/10" : "bg-white/80 border-gray-200"
        } border-b`}
    >
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              BookMise Community
            </h1>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Share your reading journey
            </p>
          </div>
        </div>

        <button
          onClick={setMineOnly}
          className={`flex items-center gap-2 px-4 py-2 rounded-full ${mineOnly
              ? "bg-purple-500 text-white"
              : isDark
                ? "bg-white/10 text-gray-300"
                : "bg-gray-200 text-gray-700"
            }`}
        >
          {mineOnly ? <User className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
          {mineOnly ? "My Posts" : "All Posts"}
        </button>
      </div>
    </header>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-10 w-10 border-4 border-purple-500 border-t-transparent animate-spin rounded-full" />
    </div>
  );
}

function EmptyState({ isDark }) {
  return (
    <div className="text-center py-16">
      <MessageCircle
        className={`w-10 h-10 mx-auto mb-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}
      />
      <p className={`text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`}>No posts yet</p>
      <p className="text-sm text-gray-500 mt-2">Be the first to share something!</p>
    </div>
  );
}

/* ─────────────────────── PostCard ─────────────────────── */
function PostCard({ post, session, onLike, onDelete, onEdit, darkMode }) {
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState(post.content);
  const isLiked = post.likes.includes(session.user.id);

  /* small class map */
  const C = {
    card: darkMode
      ? "bg-navy-800/30 border-white/10 hover:bg-navy-800/50"
      : "bg-white/80 border-gray-200 hover:bg-white/90 shadow",
    title: darkMode ? "text-white" : "text-gray-900",
    body: darkMode ? "text-gray-200" : "text-gray-700",
    faded: darkMode ? "text-gray-400" : "text-gray-500"
  };

  return (
    <div className={`backdrop-blur-xl border rounded-xl p-6 transition ${C.card}`}>
      {/* header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
          <span className="text-white font-medium text-sm">
            {(post?.username?.[0] || "U").toUpperCase()}
          </span>        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-semibold ${C.title}`}>{post.username}</span>
            <span className={`text-xs ${C.faded}`}>{formatTimeAgo(post.created_at)}</span>
          </div>

          {editMode ? (
            <textarea
              rows={3}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className={`w-full border p-2 rounded-lg focus:ring-2 focus:ring-purple-500 ${darkMode ? "bg-white/10 border-white/20 text-white" : "bg-white border-gray-300"
                }`}
            />
          ) : (
            <p className={`leading-relaxed ${C.body}`}>{post.content}</p>
          )}
        </div>
      </div>

      {/* actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={onLike}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isLiked
                ? "bg-red-500/20 text-red-400"
                : darkMode
                  ? "bg-white/5 text-gray-400"
                  : "bg-gray-100 text-gray-500"
              }`}
          >
            <Heart
              className={`w-4 h-4 ${isLiked ? "fill-red-500 stroke-red-500" : ""}`}
            />
            <span className="text-sm">{post.like_count}</span>
          </button>
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <MessageCircle className="w-4 h-4" /> {post.comments_count ?? 0}
          </div>
        </div>

        {post.user_id === session.user.id && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (editMode) onEdit(post.id, editText);
                setEditMode(!editMode);
              }}
              className="p-2 rounded-full hover:bg-white/10 text-gray-400"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-full hover:bg-white/10 text-gray-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────── Modal shell ─────────────────────── */
function Modal({ children, onClose, isDark }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border ${isDark ? "bg-navy-900/90 border-white/20" : "bg-white border-gray-200"
          }`}
      >
        {children}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full ${isDark
              ? "bg-white/10 text-gray-400 hover:bg-white/20"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
