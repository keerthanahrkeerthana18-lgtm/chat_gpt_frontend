import React, { useState, useRef, useEffect } from 'react';
import {
    Plus, MessageSquare, PanelLeft, Bot,
    User, SendHorizontal, LogOut, Settings, Sparkles,
    Trash2, Home
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const Dashboard = () => {
    const navigate = useNavigate();
    const [activeView, setActiveView] = useState('chat'); // 'chat' or 'profile'
    const [messages, setMessages] = useState([]);
    const [history, setHistory] = useState([]);
    const [activeChatId, setActiveChatId] = useState(null);
    const [input, setInput] = useState('');
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [userEmail, setUserEmail] = useState(null);
    const scrollRef = useRef(null);

    // 1. Check Auth & Load User
    useEffect(() => {
        console.log("Dashboard mounted. Checking auth...");
        const token = localStorage.getItem('access_token');
        const email = localStorage.getItem('user_email');
        console.log("Token:", token ? "Exists" : "Missing", "Email:", email);

        if (!token) {
            console.log("Redirecting to login...");
            navigate('/login');
        } else {
            setUserEmail(email || 'Guest');
        }
    }, [navigate]);
    // 2. Load History from Backend
    useEffect(() => {
        const fetchHistory = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) return;
            try {
                const res = await fetch('http://127.0.0.1:8000/chats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setHistory(data);
                } else if (res.status === 401) {
                    handleLogout();
                }
            } catch (e) {
                console.error("Failed to fetch history:", e);
            }
        };
        fetchHistory();
    }, [userEmail]); // Re-fetch if user changes

    // 3. Scroll to bottom
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);


    const handleSend = async () => {
        if (!input.trim()) return;

        const userQuery = input;
        const newUserMsg = { role: 'user', content: userQuery };

        // Optimistic UI update
        setMessages(prev => [...prev, newUserMsg]);
        setInput('');
        setIsTyping(true);

        const token = localStorage.getItem('access_token');
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        try {
            let currentChatId = activeChatId;

            // 1. Create Chat if needed
            if (!currentChatId) {
                const createRes = await fetch('http://127.0.0.1:8000/chats', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ title: userQuery.substring(0, 30) })
                });
                if (!createRes.ok) throw new Error("Failed to create chat");
                const newChat = await createRes.json();
                currentChatId = newChat.id;
                setActiveChatId(currentChatId);
                setHistory(prev => [newChat, ...prev]);
            }

            // 2. Save User Message
            await fetch(`http://127.0.0.1:8000/chats/${currentChatId}/messages`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ role: 'user', content: userQuery })
            });

            // 3. Get AI Response
            const response = await fetch('http://127.0.0.1:8000/ask', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    message: userQuery,
                    system_prompt: "You are a helpful assistant."
                })
            });

            if (response.status === 401) {
                handleLogout();
                return;
            }

            const data = await response.json();
            const aiMsg = { role: 'assistant', content: data.response };

            // 4. Save AI Message
            await fetch(`http://127.0.0.1:8000/chats/${currentChatId}/messages`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ role: 'assistant', content: data.response })
            });

            setMessages(prev => [...prev, aiMsg]);

        } catch (error) {
            console.error("Failed to fetch chat:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Error: Could not connect to server." }]);
        } finally {
            setIsTyping(false);
        }
    };

    const startNewChat = () => {
        setMessages([]);
        setActiveChatId(null);
        setActiveView('chat');
    };

    const loadChat = async (chatId) => {
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`http://127.0.0.1:8000/chats/${chatId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const chat = await res.json();
                setMessages(chat.messages || []);
                setActiveChatId(chatId);
                setActiveView('chat');
                if (window.innerWidth < 768) setSidebarOpen(false);
            }
        } catch (e) {
            console.error("Failed to load chat:", e);
        }
    };

    const deleteChat = async (e, chatId) => {
        e.stopPropagation();
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`http://127.0.0.1:8000/chats/${chatId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setHistory(prev => prev.filter(h => h.id !== chatId));
                if (activeChatId === chatId) {
                    startNewChat();
                }
            }
        } catch (e) {
            console.error("Failed to delete chat:", e);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_email');
        navigate('/login');
    };

    console.log("Dashboard rendering. History length:", history?.length, "Messages length:", messages?.length);

    return (
        <div className="flex h-screen bg-white text-gray-900 font-sans antialiased">

            {/* SIDEBAR: History & Actions */}
            <aside className={`${isSidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 bg-[#f9f9f9] border-r border-gray-200 flex flex-col overflow-hidden`}>
                <div className="p-4 flex flex-col h-full min-w-[288px]">
                    <button
                        onClick={startNewChat}
                        className="flex items-center gap-3 w-full p-3 mb-6 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 shadow-sm transition-all text-sm font-semibold"
                    >
                        <Plus size={18} className="text-blue-600" />
                        New Chat
                    </button>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {/* App Navigation */}
                        <div className="mb-6">
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-3">Menu</h3>
                            <ul className="space-y-1">
                                <li>
                                    <button onClick={() => setActiveView('chat')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${activeView === 'chat' && !activeChatId ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-200'}`}>
                                        <MessageSquare size={16} /> Chat
                                    </button>
                                </li>
                                <li>
                                    <button onClick={() => { setActiveView('profile'); if (window.innerWidth < 768) setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${activeView === 'profile' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-200'}`}>
                                        <User size={16} /> Profile
                                    </button>
                                </li>
                            </ul>
                        </div>

                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-3">Recent History</h3>
                        <div className="space-y-1">
                            {history.length === 0 && (
                                <p className="text-xs text-gray-400 px-3">No history yet.</p>
                            )}
                            {Array.isArray(history) && history.map((chat) => (
                                <div
                                    key={chat.id}
                                    onClick={() => loadChat(chat.id)}
                                    className={`group flex items-center justify-between p-3 text-sm rounded-lg cursor-pointer transition-colors ${activeChatId === chat.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
                                >
                                    <div className="flex items-center gap-3 truncate">
                                        <MessageSquare size={16} />
                                        <span className="truncate">{chat.title}</span>
                                    </div>
                                    <button onClick={(e) => deleteChat(e, chat.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-300 rounded text-gray-400 hover:text-red-500 transition-all">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200 space-y-1">
                        <button className="flex items-center gap-3 w-full p-3 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">
                            <Settings size={18} /> Settings
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full p-3 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                            <LogOut size={18} /> Logout
                        </button>
                    </div>
                </div>
            </aside>

            {/* MAIN CHAT AREA */}
            <main className="flex-1 flex flex-col min-w-0 bg-white">

                {/* Top Bar */}
                <header className="h-16 border-b border-gray-100 flex items-center justify-between px-4">
                    <button
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                    >
                        <PanelLeft size={20} />
                    </button>

                    <div className="flex items-center gap-2 font-semibold text-gray-700">
                        <Sparkles size={20} className="text-blue-600" />
                        <span>AI Assistant</span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs cursor-pointer">
                        AI
                    </div>
                </header>

                {/* Content Area */}
                {activeView === 'chat' ? (
                    <>
                        {/* Message Thread */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8">
                            <div className="max-w-3xl mx-auto space-y-6">
                                {messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full pt-20 text-center opacity-40">
                                        <Bot size={64} className="mb-4 text-gray-300" />
                                        <h2 className="text-2xl font-semibold text-gray-800">Welcome to AI Assistant</h2>
                                        <p className="max-w-xs mt-2">Ask anything. I'm here to help.</p>
                                    </div>
                                ) : (
                                    messages.map((m, idx) => (
                                        <div key={idx} className={`flex gap-4 ${m.role === 'assistant' ? 'bg-gray-50 p-6 rounded-2xl border border-gray-100' : 'px-6'}`}>
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${m.role === 'user' ? 'bg-gray-800' : 'bg-blue-600'}`}>
                                                {m.role === 'user' ? <User size={20} className="text-white" /> : <Bot size={20} className="text-white" />}
                                            </div>
                                            <div className="flex-1 text-gray-800 leading-relaxed pt-1.5 text-[15px] whitespace-pre-wrap">
                                                {m.content}
                                            </div>
                                        </div>
                                    ))
                                )}
                                {isTyping && (
                                    <div className="flex gap-4 px-6 animate-pulse">
                                        <div className="w-9 h-9 rounded-lg bg-gray-200 shrink-0" />
                                        <div className="space-y-3 flex-1 pt-3">
                                            <div className="h-3 bg-gray-100 rounded w-full" />
                                            <div className="h-3 bg-gray-100 rounded w-2/3" />
                                        </div>
                                    </div>
                                )}
                                <div ref={scrollRef} />
                            </div>
                        </div>

                        {/* Input Section */}
                        <div className="p-4 md:pb-10 bg-white border-t border-gray-50">
                            <div className="max-w-3xl mx-auto relative group">
                                <textarea
                                    rows={1}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="How can I help you today?"
                                    className="w-full p-4 pr-14 bg-gray-100 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl outline-none transition-all resize-none shadow-sm"
                                    style={{ minHeight: '60px' }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isTyping}
                                    className={`absolute right-3 bottom-3 p-2 rounded-xl transition-all ${input.trim() && !isTyping ? 'bg-blue-600 text-white shadow-lg scale-100' : 'bg-gray-300 text-gray-500 scale-95 cursor-not-allowed'}`}
                                >
                                    <SendHorizontal size={20} />
                                </button>
                            </div>
                            <p className="text-center text-[10px] text-gray-400 mt-3 font-medium">
                                AI Assistant. Verified for accuracy in 2026.
                            </p>
                        </div>
                    </>
                ) : (
                    /* Profile View */
                    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md w-full">
                            <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center text-blue-600">
                                <User size={48} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-1">{userEmail?.split('@')[0] || 'User'}</h2>
                            <p className="text-gray-500 mb-6">{userEmail || 'guest@example.com'}</p>

                            <div className="space-y-3">
                                <div className="p-4 bg-gray-50 rounded-xl text-left">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Account Details</h3>
                                    <p className="text-sm text-gray-600 flex justify-between">
                                        <span>Status:</span>
                                        <span className="text-green-600 font-medium">Active</span>
                                    </p>
                                    <p className="text-sm text-gray-600 flex justify-between mt-1">
                                        <span>Plan:</span>
                                        <span className="text-blue-600 font-medium">Free Tier</span>
                                    </p>
                                </div>

                                <button className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition font-medium flex items-center justify-center gap-2">
                                    <Settings size={18} /> Account Settings
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default Dashboard;