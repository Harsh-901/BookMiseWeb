/* ---------------- HomePage.jsx ---------------- */
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "./ThemeContext";

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

  /* theme */
  const { isDark, toggleTheme } = useTheme();

  const theme = {
    bg: isDark
      ? "bg-gradient-to-br from-[#09080f] via-[#120d23] to-[#080613]"
      : "bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50",
    text: isDark ? "text-white" : "text-gray-900",
    logo: isDark ? "text-white" : "text-gray-900",
    navText: isDark ? "text-white/80 hover:text-white" : "text-gray-700 hover:text-gray-900",
    navActive: isDark ? "text-white font-medium" : "text-gray-900 font-medium",
    border: isDark ? "border-white/20" : "border-gray-200",
    gradientBorder: isDark
      ? "from-transparent via-white/10 to-transparent"
      : "from-transparent via-gray-300/50 to-transparent",
    quote: isDark ? "rgba(100,74,133,0.85)" : "rgba(79,36,125,0.85)",
    bookBody: isDark
      ? "from-[#1a2c54] via-[#1d335f] to-[#132040]"
      : "from-blue-200 via-blue-300 to-purple-200",
    spine: isDark ? "from-[#14264a] to-[#0e1a2d]" : "from-blue-300 to-purple-300",
    pageLine: isDark ? "#a1a1aa" : "#c5c5d1"
  };

  /* typing effect */
  useEffect(() => {
    const text = quotes[quoteIndex];
    setDisplayedText("");
    let pos = 0, t1, t2;
    const typeNext = () => {
      setDisplayedText(text.slice(0, pos + 1));
      pos++;
      if (pos < text.length) {
        t1 = setTimeout(typeNext, 110);
      } else {
        setIsTyping(false);
        t2 = setTimeout(() => {
          setIsTyping(true);
          setQuoteIndex(i => (i + 1) % quotes.length);
        }, 4000);
      }
    };
    t1 = setTimeout(typeNext, 110);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [quoteIndex]);

  /* hover‑tilt for book */
  const [hover, setHover] = useState(false);
  const [pos,  setPos]   = useState({x:0,y:0});
  const ref   = useRef(null);
  const mouseMove = e=>{
    if(!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const cx = r.left+r.width/2, cy = r.top+r.height/2;
    setPos({x:e.clientX-cx, y:e.clientY-cy});
  };
  const location = useLocation();

  return (
    <div className={`relative w-screen h-screen overflow-hidden ${theme.bg} ${theme.text} transition-all duration-300`}>

      {/* Navbar */}
      <nav className="relative z-10">
        <div className="flex items-center justify-between px-8 py-6">
          {/* logo */}
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 border ${theme.border} rounded flex items-center justify-center`}>
              <span className={`${theme.logo} font-bold text-sm`}>M</span>
            </div>
            <span className={`text-xl font-light tracking-wider ${theme.logo}`} style={{fontFamily:"Playfair Display, serif"}}>
              BOOKMISE
            </span>
          </div>

          {/* links */}
          <div className="flex space-x-8">
            {["Home","Library","Notes","Social","Profile"].map((item,i)=>{
              const path=item==="Home"?"/home":`/${item.toLowerCase()}`;
              const active=location.pathname===path;
              return(
                <Link key={item} to={path}
                  style={{animationDelay:`${i*100}ms`}}
                  className={`relative transition-all duration-500 font-light text-sm tracking-wide group hover:scale-110 hover:-translate-y-1
                              ${active?theme.navActive:theme.navText}`}>
                  <span className="relative z-10">{item}</span>
                  <span className={`absolute -bottom-1 left-0 h-px bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-500
                                   ${active?"w-full":"w-0 group-hover:w-full"}`} />
                </Link>);
            })}

            {/* theme toggle */}
            <button onClick={toggleTheme}
              className={`ml-2 p-2 rounded-lg transition-all duration-300 ${isDark?'bg-white/10 hover:bg-white/20':'bg-gray-200 hover:bg-gray-300'}`}>
              {isDark ? (
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" clipRule="evenodd"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707 8.001 8.001 0 1017.293 13.293z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className={`h-px bg-gradient-to-r ${theme.gradientBorder} mx-8`} />
      </nav>

      {/* Quote */}
      <div className="absolute top-[21%] w-full flex justify-center z-10">
        <h1 className="text-xl md:text-4xl font-light text-center leading-tight px-4"
          style={{fontFamily:"Playfair Display, serif", color:theme.quote}}>
          {displayedText}{isTyping && <span className="animate-pulse ml-1">|</span>}
        </h1>
      </div>

      {/* Floating book */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50">
        <div ref={ref} className="relative cursor-pointer group"
          onMouseMove={mouseMove} onMouseEnter={()=>setHover(true)}
          onMouseLeave={()=>{setHover(false); setPos({x:0,y:0});}}
          onClick={()=>window.location.href="/library"}
          style={{
            transform:`perspective(1200px) rotateY(${pos.x*0.03}deg) rotateX(${-pos.y*0.03}deg)`,
            transition:hover?"none":"transform 0.8s ease-out",
            animation:"float 8s ease-in-out infinite"
          }}>
          {/* Glow */}
          <div className="absolute inset-0 blur-3xl scale-110"
               style={{background:"radial-gradient(ellipse at 50% 60%, rgba(26,44,84,0.35) 0%, transparent 70%)"}} />
          {/* Book */}
          <div className="relative">
            <div className="w-56 h-80 sm:w-64 sm:h-96 relative overflow-hidden rounded-r-md shadow-xl">
              {/* Spine */}
              <div className={`absolute left-0 top-0 w-3 h-full bg-gradient-to-r ${theme.spine} shadow-inner`}/>
              {/* Body */}
              <div className={`absolute inset-0 bg-gradient-to-br ${theme.bookBody} rounded-r-md`} />
              {/* Outline */}
              <div className="absolute inset-0 rounded-r-md border border-white/10 pointer-events-none"/>
              {/* Pages (3 thin lines) */}
              <div className="absolute right-0 inset-y-1 w-[2px]" style={{background:theme.pageLine}}/>
              <div className="absolute right-1 inset-y-0.5 w-[2px]" style={{background:theme.pageLine}}/>
              <div className="absolute right-2 inset-y-0 w-[2px]" style={{background:theme.pageLine}}/>
              {/* Hover label */}
              <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700
                               ${hover?"opacity-100 backdrop-blur-sm":"opacity-0"}`}
                   style={{background:hover?"rgba(0,0,0,0.35)":"transparent"}}>
                <div className="text-center p-6 transition-all duration-700"
                     style={{transform:hover?"translateY(0) scale(1)":"translateY(10px) scale(0.9)"}}>
                  <h3 className="text-white text-lg font-light mb-2 tracking-wide"
                      style={{fontFamily:"Playfair Display, serif"}}>Open Library</h3>
                  <div className="w-16 h-px bg-white/60 mx-auto"/>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* fonts + float keyframes */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&display=swap');
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}
