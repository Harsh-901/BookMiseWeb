import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
// Simple time formatting function
import { Link, useLocation } from "react-router-dom";

const formatTimeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
};
import { v4 as uuidv4 } from "uuid";
import { Heart, MessageCircle, Edit3, Trash2, Send, Plus, X, Filter, Users, User } from "lucide-react";

/* 1 ── SUPABASE CLIENT ─────────────────────────────────────────────────── */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "demo-url",
  import.meta.env.VITE_SUPABASE_ANON_KEY || "demo-key"
);

/* 2 ── UTILITY: NEST COMMENTS ──────────────────────────────────────────── */
function nest(flat = []) {
  const map = {};
  flat.forEach((c) => (map[c.id] = { ...c, replies: [] }));
  const roots = [];
  flat.forEach((c) => {
    if (c.parent_id) map[c.parent_id]?.replies.push(map[c.id]);
    else roots.push(map[c.id]);
  });
  return roots;
}

/* 3 ── MAIN COMPONENT ──────────────────────────────────────────────────── */
export default function Social() {
  const [session, setSession] = useState({ user: { id: "demo", email: "demo@example.com" } });
  const [posts, setPosts] = useState([
    {
      id: "1",
      user_id: "demo",
      username: "bookworm",
      content: "Just finished reading 'The Seven Husbands of Evelyn Hugo' - absolutely incredible! The storytelling is masterful. 📚✨",
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      likes: ["demo", "user2"],
      like_count: 2,
      comments_count: 3
    },
    {
      id: "2", 
      user_id: "user2",
      username: "readingaddict",
      content: "Looking for book recommendations in the fantasy genre. Any suggestions for something similar to Brandon Sanderson's work?",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      likes: ["demo"],
      like_count: 1,
      comments_count: 5
    },
    {
      id: "3",
      user_id: "demo", 
      username: "bookworm",
      content: "Started a new book club with friends! We're beginning with 'Klara and the Sun' by Kazuo Ishiguro. So excited to discuss it! 🤖📖",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      likes: [],
      like_count: 0,
      comments_count: 1
    }
  ]);
  const [showModal, setModal] = useState(false);
  const [body, setBody] = useState("");
  const [filterMine, setMine] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /* 3‑A  auth + realtime feed subscription */
  useEffect(() => {
    // Demo mode - no actual Supabase calls
    if (import.meta.env.VITE_SUPABASE_URL) {
      supabase.auth.getSession().then(({ data }) => setSession(data.session));
      const channel = supabase
        .channel("public:posts")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "posts" },
          () => fetchFeed()
        )
        .subscribe();
      fetchFeed();
      return () => supabase.removeChannel(channel);
    }
  }, []);

  /* 3‑B  fetch entire feed */
  const fetchFeed = async () => {
    if (!import.meta.env.VITE_SUPABASE_URL) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetch posts →", error.message);
      setIsLoading(false);
      return;
    }
    setPosts(data.map((p) => ({ ...p, like_count: p.likes?.length ?? 0 })));
    setIsLoading(false);
  };

  /* 3‑C  create a post */
  const createPost = async () => {
    if (!body.trim()) return;
    
    if (import.meta.env.VITE_SUPABASE_URL) {
      const { error } = await supabase.from("posts").insert({
        id: uuidv4(),
        user_id: session.user.id,
        username: session.user.user_metadata?.username ?? session.user.email.split("@")[0],
        content: body.trim(),
        likes: [],
        comments_count: 0
      });
      if (error) {
        alert("Post failed: " + error.message);
        return;
      }
    } else {
      // Demo mode
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
      setPosts(prev => [newPost, ...prev]);
    }
    
    setBody("");
    setModal(false);
  };

  /* 3‑D  like / unlike */
  const toggleLike = async (post) => {
    const liked = post.likes?.includes(session.user.id);
    const newLikes = liked
      ? post.likes.filter((id) => id !== session.user.id)
      : [...(post.likes ?? []), session.user.id];

    if (import.meta.env.VITE_SUPABASE_URL) {
      const { error, data } = await supabase
        .from("posts")
        .update({ likes: newLikes })
        .eq("id", post.id)
        .select()
        .single();

      if (error) {
        console.error("like error →", error.message);
        return;
      }
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...data, like_count: newLikes.length } : p
        )
      );
    } else {
      // Demo mode
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, likes: newLikes, like_count: newLikes.length } : p
        )
      );
    }
  };

  /* 3‑E  edit / delete */
  const updatePost = async (postId, newText) => {
    if (import.meta.env.VITE_SUPABASE_URL) {
      await supabase.from("posts").update({ content: newText }).eq("id", postId);
    } else {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: newText } : p));
    }
  };
  
  const deletePost = async (id) => {
    if (import.meta.env.VITE_SUPABASE_URL) {
      await supabase.from("posts").delete().eq("id", id);
    } else {
      setPosts(prev => prev.filter(p => p.id !== id));
    }
  };

  if (!session) return null;

  const visiblePosts = filterMine
    ? posts.filter((p) => p.user_id === session.user.id)
    : posts;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <nav className="relative z-10">
                <div className="flex items-center justify-between px-8 py-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 border border-white/20 rounded flex items-center justify-center">
                            <span className="text-white font-bold text-sm">M</span>
                        </div>
                        <span
                            className="text-xl font-light tracking-wider"
                            style={{ fontFamily: "Playfair Display, serif" }}
                        >
                            BOOKMISE
                        </span>
                    </div>

                    <div className="flex space-x-8">
                        {["Home", "Library", "Notes", "Social", "Profile"].map((item, index) => {
                            const path = item === "Home" ? "/home" : `/${item.toLowerCase()}`;
                            const isActive = location.pathname === path;

                            return (
                                <Link
                                    key={item}
                                    to={path}
                                    className={`relative transition-all duration-500 font-light text-sm tracking-wide group hover:scale-110 hover:-translate-y-1 ${isActive ? "text-white font-medium" : "text-white/80 hover:text-white"
                                        }`}
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    <span className="relative z-10">{item}</span>
                                    <span
                                        className={`absolute -bottom-1 left-0 h-px bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-500 ${isActive ? "w-full" : "w-0 group-hover:w-full"
                                            }`}
                                    />
                                </Link>
                            );
                        })}
                    </div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-8" />
            </nav>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/20 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">BookMise Community</h1>
                <p className="text-sm text-gray-400">Share your reading journey</p>
              </div>
            </div>
            
            <button
              onClick={() => setMine(!filterMine)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                filterMine 
                  ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25" 
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              {filterMine ? <User className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
              {filterMine ? "My Posts" : "All Posts"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        )}

        {/* Posts */}
        <div className="space-y-6">
          {visiblePosts.map((post, index) => (
            <div
              key={post.id}
              className="opacity-0 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
            >
              <PostCard
                post={post}
                session={session}
                onLike={() => toggleLike(post)}
                onDelete={() => deletePost(post.id)}
                onEdit={updatePost}
              />
            </div>
          ))}
        </div>

        {visiblePosts.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-400 text-lg">No posts yet</p>
            <p className="text-gray-500 text-sm mt-2">Be the first to share something!</p>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => setModal(true)}
        className="fixed bottom-8 right-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 w-14 h-14 rounded-full shadow-lg shadow-purple-500/25 flex items-center justify-center transition-all duration-200 hover:scale-110 group"
      >
        <Plus className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-200" />
      </button>

      {/* Modal */}
      {showModal && (
        <Modal onClose={() => setModal(false)}>
          <div className="p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              Share Your Thoughts
            </h3>
            <textarea
              rows="4"
              className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What's on your mind? Share a book recommendation, reading update, or thought..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setModal(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createPost}
                disabled={!body.trim()}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Post
              </button>
            </div>
          </div>
        </Modal>
      )}

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
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}

/* 4 ── POST CARD ─────────────────────────────────────────────────────────── */
function PostCard({ post, session, onLike, onDelete, onEdit }) {
  const [showCom, setShowCom] = useState(false);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState(post.content);
  const [isLiked, setIsLiked] = useState(post.likes?.includes(session.user.id));

  /* fetch comments when toggled open */
  const loadComments = async () => {
    if (showCom) return setShowCom(false);

    if (import.meta.env.VITE_SUPABASE_URL) {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("fetch comments →", error.message);
        return;
      }
      setComments(data || []);
    } else {
      // Demo comments
      setComments([
        {
          id: "1",
          user_id: "user2",
          content: "I loved that book too! The plot twists were incredible.",
          created_at: new Date().toISOString(),
          parent_id: null
        }
      ]);
    }
    setShowCom(true);
  };

  /* send comment / reply */
  const sendComment = async (parent_id) => {
    if (!text.trim()) return;
    
    if (import.meta.env.VITE_SUPABASE_URL) {
      const { error } = await supabase.from("comments").insert({
        id: uuidv4(),
        user_id: session.user.id,
        post_id: post.id,
        content: text.trim(),
        parent_id,
      });
      if (error) {
        console.error("send comment →", error.message);
        return;
      }
    } else {
      // Demo mode
      const newComment = {
        id: uuidv4(),
        user_id: session.user.id,
        content: text.trim(),
        created_at: new Date().toISOString(),
        parent_id
      };
      setComments(prev => [...prev, newComment]);
    }
    
    setText("");
    if (!showCom) loadComments();
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike();
  };

  const nested = nest(comments);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 group">
      {/* User Info */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white font-medium text-sm">
            {post.username?.[0]?.toUpperCase() || "U"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white">{post.username}</span>
            <span className="text-xs text-gray-400">
              {formatTimeAgo(post.created_at)}
            </span>
          </div>
          
          {/* Content */}
          {editMode ? (
            <textarea
              className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows="3"
            />
          ) : (
            <p className="text-gray-200 leading-relaxed">{post.content}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 ${
              isLiked
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-red-400"
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            <span className="text-sm font-medium">{post.like_count}</span>
          </button>
          
          <button
            onClick={loadComments}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-blue-400 transition-all duration-200"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{post.comments_count ?? 0}</span>
          </button>
        </div>

        {/* Edit/Delete for own posts */}
        {post.user_id === session.user.id && (
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => {
                if (editMode) onEdit(post.id, editText);
                setEditMode(!editMode);
              }}
              className="p-2 text-gray-400 hover:text-green-400 hover:bg-white/10 rounded-full transition-all duration-200"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded-full transition-all duration-200"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Comments Section */}
      {showCom && (
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="space-y-4">
            {nested.map((c) => (
              <CommentNode
                key={c.id}
                node={c}
                depth={0}
                onReply={sendComment}
              />
            ))}
          </div>

          {/* New Comment Input */}
          <div className="flex gap-3 mt-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-medium text-xs">
                {session.user.email?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 flex gap-2">
              <input
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write a comment..."
                onKeyPress={(e) => e.key === 'Enter' && sendComment(null)}
              />
              <button
                onClick={() => sendComment(null)}
                disabled={!text.trim()}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* 5 ── RECURSIVE COMMENT NODE ───────────────────────────────────────────── */
function CommentNode({ node, depth, onReply }) {
  const [showReply, setShowReply] = useState(false);
  const [reply, setReply] = useState("");
  const leftPad = depth * 20;

  return (
    <div className="space-y-3">
      <div className="bg-white/5 rounded-lg p-3" style={{ marginLeft: leftPad }}>
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-medium text-xs">U</span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-200">{node.content}</p>
            <button
              onClick={() => setShowReply(!showReply)}
              className="text-xs text-purple-400 hover:text-purple-300 mt-1 transition-colors"
            >
              Reply
            </button>
          </div>
        </div>
      </div>

      {showReply && (
        <div className="flex gap-2" style={{ marginLeft: leftPad + 20 }}>
          <input
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Your reply..."
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                onReply(node.id);
                setReply("");
                setShowReply(false);
              }
            }}
          />
          <button
            onClick={() => {
              onReply(node.id);
              setReply("");
              setShowReply(false);
            }}
            className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm transition-colors"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      )}

      {node.replies?.map((r) => (
        <CommentNode
          key={r.id}
          node={r}
          depth={depth + 1}
          onReply={onReply}
        />
      ))}
    </div>
  );
}

/* 6 ── ENHANCED MODAL ───────────────────────────────────────────────────── */
function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {children}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}