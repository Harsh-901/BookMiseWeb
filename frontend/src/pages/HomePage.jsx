import React, { useEffect, useRef, useState } from "react";
// import { Link } from "react-router-dom";
import { Link, useLocation } from "react-router-dom";

const quotes = [
    "Books are a uniquely portable magic",
    "A reader lives a thousand lives before he dies",
    "Books are mirrors: you only see in them what you already have inside you",
    "The more that you read, the more things you will know",
    "Reading is to the mind what exercise is to the body",
    "A book is a dream that you hold in your hands",
    "Words have no single fixed meaning, but books do",
    "Reading gives us someplace to go when we have to stay where we are",
    "Books are the quietest and most constant of friends",
    "Literature is the most agreeable way of ignoring life"
];

export default function HomePage() {
    const [quoteIndex, setQuoteIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState("");
    const [isTyping, setIsTyping] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const bookRef = useRef(null);
    const location = useLocation();

    useEffect(() => {
        const text = quotes[quoteIndex];
        setDisplayedText("");
        let pos = 0;
        let t1, t2;

        const typeNext = () => {
            setDisplayedText(text.slice(0, pos + 1));
            pos++;
            if (pos < text.length) {
                t1 = setTimeout(typeNext, 110);
            } else {
                setIsTyping(false);
                t2 = setTimeout(() => {
                    setIsTyping(true);
                    setQuoteIndex((i) => (i + 1) % quotes.length);
                }, 4000);
            }
        };

        t1 = setTimeout(typeNext, 110);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [quoteIndex]);

    const handleMouseMove = (e) => {
        if (!bookRef.current) return;
        const rect = bookRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        setMousePosition({ x: e.clientX - cx, y: e.clientY - cy });
    };

    const handleBookClick = () => {
        window.location.href = "/library";
    };

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-br from-[#09080f] via-[#120d23] to-[#080613] text-white">
            {/* ✅ Navbar */}
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

            {/* 💬 Quote Positioned Between Navbar and Book */}
            <div className="absolute top-[21%] w-full flex justify-center  items-center z-10">
                <h1
                    className="text-xl md:text-4xl font-light text-center leading-tight px-4"
                    style={{
                        fontFamily: "Playfair Display, serif",
                        color: "rgba(100, 74, 133, 0.85)",
                    }}
                >
                    {displayedText}
                    {isTyping && <span className="animate-pulse ml-1">|</span>}
                </h1>
            </div>

            {/* 📘 Book at Bottom Center */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50">
                <div
                    ref={bookRef}
                    className="relative cursor-pointer group"
                    onMouseMove={handleMouseMove}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => {
                        setIsHovered(false);
                        setMousePosition({ x: 0, y: 0 });
                    }}
                    onClick={handleBookClick}
                    style={{
                        transform: `perspective(1200px) rotateY(${mousePosition.x * 0.03}deg) rotateX(${-mousePosition.y * 0.03}deg)`,
                        transition: isHovered ? "none" : "transform 0.8s ease-out",
                        animation: "float 8s ease-in-out infinite",
                    }}
                >
                    {/* Glow */}
                    <div
                        className="absolute inset-0 blur-3xl scale-110"
                        style={{
                            background:
                                "radial-gradient(ellipse at 50% 60%, rgba(26,44,84,0.35) 0%, transparent 70%)",
                        }}
                    />

                    {/* Book */}
                    <div className="relative">
                        <div className="w-56 h-80 sm:w-64 sm:h-96 relative overflow-hidden rounded-r-md shadow-xl">
                            {/* Spine */}
                            <div className="absolute left-0 top-0 w-3 h-full bg-gradient-to-r from-[#14264a] to-[#0e1a2d] shadow-inner" />
                            {/* Book body */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#1a2c54] via-[#1d335f] to-[#132040] rounded-r-md" />
                            {/* Outline */}
                            <div className="absolute inset-0 rounded-r-md border border-white/10 pointer-events-none" />
                            {/* Pages */}
                            <div className="absolute right-0 inset-y-1 w-[2px] bg-[#a1a1aa]" />
                            <div className="absolute right-1 inset-y-0.5 w-[2px] bg-[#d4d4d8]" />
                            <div className="absolute right-2 inset-y-0 w-[2px] bg-[#e4e4e7]" />
                            {/* Hover Label */}
                            <div
                                className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${isHovered ? "opacity-100 backdrop-blur-sm" : "opacity-0"
                                    }`}
                                style={{
                                    background: isHovered ? "rgba(0,0,0,0.35)" : "transparent",
                                }}
                            >
                                <div
                                    className="text-center p-6 transition-all duration-700"
                                    style={{
                                        transform: isHovered
                                            ? "translateY(0) scale(1)"
                                            : "translateY(10px) scale(0.9)",
                                    }}
                                >
                                    <h3
                                        className="text-white text-lg font-light mb-2 tracking-wide"
                                        style={{
                                            fontFamily: "Playfair Display, serif",
                                        }}
                                    >
                                        Open Library
                                    </h3>
                                    <div className="w-16 h-px bg-white/60 mx-auto" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fonts & Float */}
            <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&display=swap');
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px);
          }
        }
      `}</style>
        </div>
    );
}
