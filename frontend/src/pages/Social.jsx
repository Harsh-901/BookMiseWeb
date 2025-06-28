import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { formatDistanceToNow } from "date-fns";
// import Navbar from "../components/YOUR_NAVBAR_COMPONENT";
import { api } from "../utils/api";                  // small fetch wrapper
import { v4 as uuid } from "uuid";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ---------- helper to nest comments ---------- */
function nest(flat = []) {
  const map = {};
  flat.forEach(c => (map[c.id] = { ...c, replies: [] }));
  const roots = [];
  flat.forEach(c => {
    if (c.parent_id) map[c.parent_id]?.replies.push(map[c.id]);
    else roots.push(map[c.id]);
  });
  return roots;
}

export default function Social() {
  const [session, setSession] = useState(null);
  const [posts, setPosts]     = useState([]);
  const [showModal, setModal] = useState(false);
  const [body, setBody]       = useState("");
  const [filterMine, setMine] = useState(false);

  /* ── session & initial feed ── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    const feed = await api("/api/posts");        // GET from backend
    setPosts(feed || []);
  };

  /* ── create post ── */
  async function createPost() {
    if (!body.trim()) return;
    await api("/api/posts", {
      method: "POST",
      body: JSON.stringify({
        user_id: session.user.id,
        content: body.trim(),
      }),
    });
    setBody("");
    setModal(false);
    fetchFeed();
  }

  /* ── like / unlike ── */
  async function toggleLike(post) {
    await api("/api/likes", {
      method: "POST",
      body: JSON.stringify({
        user_id: session.user.id,
        post_id: post.id,
      }),
    });
    fetchFeed();
  }

  /* ── update / delete ── */
  async function updatePost(postId, newText) {
    await api(`/api/posts/${postId}`, {
      method: "PUT",
      body: JSON.stringify({
        user_id: session.user.id,
        content: newText,
      }),
    });
    fetchFeed();
  }
  async function deletePost(id) {
    await api(`/api/posts/${id}?user_id=${session.user.id}`, {
      method: "DELETE",
    });
    fetchFeed();
  }

  if (!session) return null;

  const visiblePosts = filterMine
    ? posts.filter(p => p.user_id === session.user.id)
    : posts;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#09080f] via-[#120d23] to-[#080613] text-white">
      {/* <Navbar /> */}
      <main className="flex-1 flex flex-col items-center mt-10 px-4">
        <h1 className="text-3xl font-light mb-6">Community Feed</h1>

        <div className="mb-4 flex gap-4">
          <button
            onClick={() => setMine(!filterMine)}
            className={`px-3 py-1 rounded ${
              filterMine ? "bg-sky-500" : "bg-white/10"
            }`}
          >
            {filterMine ? "Show All" : "Show My Posts"}
          </button>
        </div>

        <div className="w-full max-w-[680px] space-y-6">
          {visiblePosts.map(p => (
            <PostCard
              key={p.id}
              post={p}
              session={session}
              onLike={() => toggleLike(p)}
              onDelete={() => deletePost(p.id)}
              onEdit={updatePost}
            />
          ))}
        </div>
      </main>

      {/* new post button */}
      <button
        onClick={() => setModal(true)}
        className="fixed bottom-8 right-8 bg-sky-500 hover:bg-sky-600 w-12 h-12 rounded-full text-3xl flex items-center justify-center"
      >
        +
      </button>

      {showModal && (
        <Modal onClose={() => setModal(false)}>
          <h3 className="text-lg mb-3">New Post</h3>
          <textarea
            rows="4"
            className="w-full bg-white/20 p-2 rounded"
            value={body}
            onChange={e => setBody(e.target.value)}
          />
          <div className="flex justify-end gap-3 mt-3">
            <button
              onClick={() => setModal(false)}
              className="px-3 py-1 bg-gray-400/40 rounded"
            >
              Cancel
            </button>
            <button
              onClick={createPost}
              className="px-3 py-1 bg-sky-500 hover:bg-sky-600 rounded"
            >
              Post
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- PostCard ---------- */
function PostCard({ post, session, onLike, onDelete, onEdit }) {
  const [showCom, setShowCom] = useState(false);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState(post.content);

  /* load comments once per toggle */
  const loadComments = async () => {
    if (showCom) return setShowCom(false);
    const list = await api(`/api/comments?post_id=${post.id}`);
    setComments(list || []);
    setShowCom(true);
  };

  const sendComment = async parent_id => {
    if (!text.trim()) return;
    await api("/api/comments", {
      method: "POST",
      body: JSON.stringify({
        user_id: session.user.id,
        post_id: post.id,
        content: text.trim(),
        parent_id,
      }),
    });
    setText("");
    loadComments();
  };

  const nested = nest(comments);

  return (
    <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg">
      <div className="flex justify-between">
        {editMode ? (
          <input
            className="flex-1 bg-white/20 p-1 rounded mr-2"
            value={editText}
            onChange={e => setEditText(e.target.value)}
          />
        ) : (
          <p className="flex-1">{post.content}</p>
        )}

        <span className="text-xs text-white/60">
          {formatDistanceToNow(new Date(post.created_at))} ago
        </span>
      </div>

      {post.book_id && (
        <p className="text-xs text-sky-300 mt-1">📖 {post.book_id}</p>
      )}

      <div className="flex gap-4 mt-3 text-sm">
        <button onClick={onLike} className="text-sky-300 hover:text-sky-100">
          ❤️ {post.like_count}
        </button>
        <button onClick={loadComments} className="text-sky-300 hover:text-sky-100">
          💬 {comments.length}
        </button>

        {post.user_id === session.user.id && (
          <>
            <button
              onClick={() => {
                if (editMode) {
                  onEdit(post.id, editText);
                }
                setEditMode(!editMode);
              }}
              className="text-green-400 hover:text-green-200"
            >
              {editMode ? "Save" : "Edit"}
            </button>
            <button
              onClick={onDelete}
              className="text-red-400 hover:text-red-200"
            >
              Delete
            </button>
          </>
        )}
      </div>

      {/* comments */}
      {showCom && (
        <div className="mt-4">
          {nested.map(c => (
            <CommentNode
              key={c.id}
              node={c}
              depth={0}
              onReply={sendComment}
              me={session.user.id}
            />
          ))}

          <div className="flex gap-2 mt-2">
            <input
              className="flex-1 bg-white/20 px-2 py-1 rounded text-sm"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Write a comment…"
            />
            <button
              onClick={() => sendComment(null)}
              className="px-3 bg-sky-500 hover:bg-sky-600 rounded text-sm"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Recursive CommentNode ---------- */
function CommentNode({ node, depth, onReply, me }) {
  const [showReply, setShowReply] = useState(false);
  const [reply, setReply] = useState("");
  const leftPad = depth * 16;

  return (
    <div className="mt-2">
      <div
        className="bg-white/5 p-2 rounded"
        style={{ marginLeft: leftPad }}
      >
        <p className="text-sm">{node.content}</p>
        <button
          onClick={() => setShowReply(!showReply)}
          className="text-xs text-sky-300 hover:text-sky-100"
        >
          Reply
        </button>
      </div>

      {showReply && (
        <div className="flex gap-2 mt-1" style={{ marginLeft: leftPad + 16 }}>
          <input
            className="flex-1 bg-white/20 px-2 py-1 rounded text-xs"
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Your reply…"
          />
          <button
            onClick={() => {
              onReply(node.id, reply);
              setReply("");
              setShowReply(false);
            }}
            className="px-2 bg-sky-500 hover:bg-sky-600 rounded text-xs"
          >
            Send
          </button>
        </div>
      )}

      {node.replies.map(r => (
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

/* ---------- Reusable Modal ---------- */
function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#1a1a2e] p-6 rounded w-96 max-w-full">
        {children}
      </div>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-xl text-white/70 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
