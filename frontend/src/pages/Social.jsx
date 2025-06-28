/* ---------------- src/pages/Social.jsx ---------------- */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";              // router link
import { createClient } from "@supabase/supabase-js";
import { formatDistanceToNow } from "date-fns";

/* -------- Supabase client -------- */
const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ---------- helper for “x min ago” if you ever drop date-fns ----------
const formatDistanceToNow = (date) =>
  Math.round((Date.now() - date.getTime()) / 60000) + " min ago";
----------------------------------------------------------------------- */

export default function Social() {
    /* ───────── state ───────── */
    const [session, setSession] = useState(null);   // <- NEW
    const [posts, setPosts] = useState([]);
    const [openModal, setModal] = useState(false);
    const [newBody, setNewBody] = useState("");

    /* ───────── fetch session & initial posts ───────── */
    useEffect(() => {
        const init = async () => {
            const { data } = await supabase.auth.getSession();
            setSession(data.session);

            fetchPosts();

            // realtime listener for posts table
            const sub = supabase
                .channel("posts-feed")
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "posts" },
                    fetchPosts
                )
                .subscribe();

            return () => supabase.removeChannel(sub);
        };
        init();
    }, []);

    /* ───────── queries ───────── */
    async function fetchPosts() {
        const { data } = await supabase
            .from("posts")
            .select(
                "id, content, created_at, likes, user_id, " +
                "comments(id, body, user_id, created_at)"
            )
            .order("created_at", { ascending: false });
        setPosts(data || []);
    }

    async function createPost() {
        const body = newBody.trim();
        if (!body) return;

        // ALWAYS fetch current session right before insert
        const {
            data: { session: freshSession },
            error: sessErr,
        } = await supabase.auth.getSession();
        if (sessErr || !freshSession) {
            alert("No auth session – please log in again");
            return;
        }

        const { data, error } = await supabase
            .from("posts")
            .insert({
                content: body,
                user_id: freshSession.user.id, // uuid stored into text column = OK
                like_count: 0,
            })
            .select()
            .single();

        console.log("Insert result:", { data, error });

        if (error) {
            alert("Insert failed → " + error.message);   // shows server error
            return;
        }

        // success
        setNewBody("");
        setModal(false);
    }


    async function toggleLike(post) {
        if (!session) return;
        const uid = session.user.id;

        const { data: existing } = await supabase
            .from("post_likes")
            .select("*")
            .eq("post_id", post.id)
            .eq("user_id", uid)
            .maybeSingle();

        if (existing) {
            await supabase.from("post_likes").delete().eq("id", existing.id);
            await supabase.from("posts").update({ likes: post.likes - 1 }).eq("id", post.id);
        } else {
            await supabase.from("post_likes").insert({ post_id: post.id, user_id: uid });
            await supabase.from("posts").update({ likes: post.likes + 1 }).eq("id", post.id);
        }
    }

    /* ───────── guard: wait for session ───────── */
    if (session === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                Loading…
            </div>
        );
    }

    /* ───────── render ───────── */
    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#09080f] via-[#120d23] to-[#080613] text-white">
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

            <main className="flex-1 flex flex-col items-center mt-10 px-4">
                <h1 className="text-3xl font-light mb-6 tracking-wide">Community Feed</h1>

                <div className="w-full max-w-[680px] space-y-6">
                    {posts.map((p) => (
                        <PostCard
                            key={p.id}
                            post={p}
                            onLike={() => toggleLike(p)}
                            session={session}
                        />
                    ))}
                </div>
            </main>

            {/* floating new-post button */}
            <button
                onClick={() => setModal(true)}
                className="fixed bottom-8 right-8 bg-sky-500 hover:bg-sky-600 w-12 h-12 text-3xl rounded-full shadow-lg flex items-center justify-center"
            >
                +
            </button>

            {/* new-post modal */}
            {openModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-[#1a1a2e] p-6 rounded w-96 space-y-4">
                        <h3 className="text-lg">New Post</h3>
                        <textarea
                            rows={4}
                            value={newBody}
                            onChange={(e) => setNewBody(e.target.value)}
                            className="w-full bg-white/20 p-2 rounded focus:outline-none"
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setModal(false)}
                                className="px-3 py-1 bg-gray-400/40 hover:bg-gray-400/60 rounded text-gray-200"
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
                    </div>
                </div>
            )}
        </div>
    );
}

/* ---------- PostCard component ---------- */
function PostCard({ post, onLike, session }) {
    const [showCom, setShow] = useState(false);
    const [comment, setComment] = useState("");

    /* add comment */
    const submitComment = async () => {
        const body = comment.trim();
        if (!body || !session) return;
        await supabase
            .from("comments")
            .insert({ post_id: post.id, user_id: session.user.id, body });
        setComment("");
        setShow(true);
    };

    return (
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg">
            <div className="flex justify-between items-start gap-4">
                <p className="font-light">{post.content}</p>
                <span className="text-xs text-white/60 whitespace-nowrap">
                    {formatDistanceToNow(new Date(post.created_at))} ago
                </span>
            </div>

            <div className="flex gap-6 mt-3 text-sm">
                <button onClick={onLike} className="text-sky-300 hover:text-sky-100">
                    ❤️ {post.likes}
                </button>
                <button onClick={() => setShow((s) => !s)} className="text-sky-300 hover:text-sky-100">
                    💬 {post.comments.length}
                </button>
            </div>

            {showCom && (
                <div className="mt-4 space-y-2">
                    {post.comments.map((c) => (
                        <p key={c.id} className="text-sm pb-1 border-b border-white/10">
                            {c.body}
                            <span className="text-xs text-white/40 ml-2">
                                {formatDistanceToNow(new Date(c.created_at))} ago
                            </span>
                        </p>
                    ))}
                    <div className="flex gap-2 mt-2">
                        <input
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Write a comment…"
                            className="flex-1 bg-white/20 px-2 py-1 rounded text-sm focus:outline-none"
                        />
                        <button
                            onClick={submitComment}
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
