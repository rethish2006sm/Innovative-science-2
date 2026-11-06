import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Gamepad2, Inbox, Pencil, Plus, Radio, Swords, UserPlus, X, Zap } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { apiRequest, assetUrl } from "../api";
import { getStoredAuth } from "../authStorage";
import BattleNavbar from "../components/BattleNavbar";
import BattleBottomNav from "../components/BattleBottomNav";

const BattleModeHome = () => {
  const navigate = useNavigate();
  const auth = getStoredAuth();
  const user = auth?.user || {};
  const [friends, setFriends] = useState([]);
  const [gameId, setGameId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [friendRequests, setFriendRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showManageFriends, setShowManageFriends] = useState(false);
  const [requestAction, setRequestAction] = useState("");
  const [removingFriend, setRemovingFriend] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);

  const loadFriends = async () => {
    try {
      const data = await apiRequest("/api/battle-mode/friends", {
        cache: "no-store",
      });
      setFriends(data.friends || []);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const data = await apiRequest("/api/battle-mode/friend-requests", { cache: "no-store" });
      setFriendRequests(data.incoming || []);
      setOutgoingRequests(data.outgoing || []);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    loadFriends();
    loadFriendRequests();
    const updatePresence = ({ userId, online }) =>
      setFriends((current) =>
        current.map((friend) =>
          String(friend.id) === String(userId) ? { ...friend, online } : friend,
        ),
      );
    const snapshotPresence = ({ userIds }) =>
      setFriends((current) =>
        current.map((friend) => ({
          ...friend,
          online: userIds.includes(String(friend.id)),
        })),
      );
    const handlePresenceUpdate = (event) => updatePresence(event.detail || {});
    const handlePresenceSnapshot = (event) => snapshotPresence(event.detail || {});
    const handleInvite = (event) => {
      const invite = event.detail || null;
      if (!invite || String(invite.targetUserId || "") !== String(auth?.user?.id || "")) return;
      setIncomingInvite(invite);
      if (invite) {
        window.setTimeout(() => setIncomingInvite((current) => current?.inviteId === invite.inviteId ? null : current), 10000);
      }
    };
    const handleFriendRequest = () => {
      loadFriendRequests();
      setShowRequests(true);
    };
    const handleFriendRequestStatus = (event) => {
      const detail = event.detail || {};
      setMessage(detail.action === "accepted" ? `${detail.name || "Your friend"} accepted your request.` : "Friend request declined.");
      loadFriends();
      loadFriendRequests();
    };
    window.addEventListener("innovative-science-battle-presence-updated", handlePresenceUpdate);
    window.addEventListener("innovative-science-battle-presence-snapshot", handlePresenceSnapshot);
    window.addEventListener("innovative-science-battle-invite", handleInvite);
    window.addEventListener("innovative-science-battle-friend-request", handleFriendRequest);
    window.addEventListener("innovative-science-battle-friend-request-status", handleFriendRequestStatus);
    const refreshTimer = window.setInterval(loadFriends, 10000);
    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener("innovative-science-battle-presence-updated", handlePresenceUpdate);
      window.removeEventListener("innovative-science-battle-presence-snapshot", handlePresenceSnapshot);
      window.removeEventListener("innovative-science-battle-invite", handleInvite);
      window.removeEventListener("innovative-science-battle-friend-request", handleFriendRequest);
      window.removeEventListener("innovative-science-battle-friend-request-status", handleFriendRequestStatus);
    };
  }, [auth?.token]);

  useEffect(() => {
    if (!showAddFriend || gameId.trim().length < 2) {
      setSearchResults([]);
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setSearchingStudents(true);
        const data = await apiRequest(`/api/battle-mode/friend-search?q=${encodeURIComponent(gameId.trim())}`, { cache: "no-store" });
        if (!cancelled) setSearchResults(data.students || []);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchingStudents(false);
      }
    }, 260);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [gameId, showAddFriend]);

  const respondToInvite = async (status) => {
    if (!incomingInvite) return;
    const invite = incomingInvite;
    window.dispatchEvent(new CustomEvent("innovative-science-battle-invite-response", { detail: { inviteId: invite.inviteId, roomCode: invite.roomCode, senderId: invite.senderId, status } }));
    setIncomingInvite(null);
    if (status === "accepted") {
      try {
        const data = await apiRequest(`/api/battle-mode/rooms/${invite.roomCode}/join`, { method: "POST" });
        navigate(`/battle-mode/room/${data.room.code}/${data.room.status === "active" ? "arena" : "lobby"}`);
      } catch (joinError) {
        setError(joinError.message);
      }
    }
  };

  const addFriend = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const normalized = gameId.trim();
    if (!/^[A-Za-z0-9_]+$/.test(normalized)) {
      setError("GameID can contain only letters, numbers, and underscores.");
      return;
    }
    try {
      const data = await apiRequest("/api/battle-mode/friend-requests", {
        method: "POST",
        body: JSON.stringify({ gameId: normalized }),
      });
      setMessage(data.message);
      setGameId("");
      setShowAddFriend(false);
      loadFriendRequests();
    } catch (addError) {
      setError(addError.message);
    }
  };

  const respondToFriendRequest = async (request, action) => {
    try {
      setRequestAction(request.id);
      const data = await apiRequest(`/api/battle-mode/friend-requests/${request.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      setMessage(data.message);
      await Promise.all([loadFriends(), loadFriendRequests()]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRequestAction("");
    }
  };

  const sendFriendRequest = async (student) => {
    try {
      setRequestAction(student.id);
      const data = await apiRequest("/api/battle-mode/friend-requests", {
        method: "POST",
        body: JSON.stringify({ userId: student.id }),
      });
      setMessage(data.message);
      setSearchResults((current) => current.map((item) => item.id === student.id ? { ...item, relationship: "pending" } : item));
      loadFriendRequests();
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.status === 409) {
        setSearchResults((current) => current.map((item) => item.id === student.id ? { ...item, relationship: requestError.message.toLowerCase().includes("already friends") ? "friends" : "pending" } : item));
      }
    } finally {
      setRequestAction("");
    }
  };

  const removeFriend = async (friend) => {
    try {
      setRemovingFriend(friend.id);
      const data = await apiRequest(`/api/battle-mode/friends/${friend.id}`, { method: "DELETE" });
      setMessage(data.message);
      setFriends((current) => current.filter((item) => String(item.id) !== String(friend.id)));
      await loadFriends();
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setRemovingFriend("");
    }
  };

  return (
    <section className="battle-lobby battle-lobby-with-bottom-nav min-h-screen px-4 pb-12 pt-5 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <BattleNavbar />
        {incomingInvite && (
          <div className="fixed left-1/2 top-4 z-[240] w-[min(92vw,25rem)] -translate-x-1/2 rounded-[1.5rem] border border-orange-200 bg-white p-4 shadow-[0_18px_60px_rgba(255,105,0,.24)]">
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-orange-600">Battle invite · 10 seconds</p>
            <p className="mt-1 text-sm font-black text-slate-950"><span className="text-orange-600">{incomingInvite.senderName}</span> invited you to {incomingInvite.roomName}.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => respondToInvite("accepted")} className="h-10 flex-1 rounded-xl bg-gradient-to-r from-[#ff8a00] to-[#ff5500] text-xs font-black text-white">Accept</button>
              <button type="button" onClick={() => respondToInvite("rejected")} className="h-10 flex-1 rounded-xl border border-orange-100 bg-orange-50 text-xs font-black text-slate-700">Reject</button>
            </div>
          </div>
        )}
        <div className="battle-hero-card relative mt-8 overflow-hidden rounded-[2.5rem] border border-orange-200 bg-white p-7 shadow-[0_20px_60px_rgba(249,115,22,.13)] sm:p-12">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-100 blur-3xl" />
          <div className="battle-hero-copy relative">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-orange-500 text-white shadow-lg shadow-orange-200">
              <Swords size={30} />
            </div>
            
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
              Ready to battle?
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
              Challenge your friends, answer faster, and climb the science ranks
              in real time.
            </p>
            <div className="battle-hero-actions mx-auto mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => navigate("/battle-mode/create")}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 font-black text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
              >
                <Plus size={19} /> Create Battle Room
              </button>
              <button
                type="button"
                onClick={() => navigate("/battle-mode/join")}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-orange-200 bg-white px-6 font-black text-orange-600 transition hover:bg-orange-50"
              >
                <Radio size={19} /> Join with Code
              </button>
            </div>
          </div>
        </div>
        <section className="mt-7 rounded-[2rem] border border-orange-100 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,.05)] sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[.28em] text-orange-500">
                Your squad
              </p>
              <h2 className="mt-2 text-2xl font-black">Friends</h2>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { setShowManageFriends(true); setShowAddFriend(false); setShowRequests(false); }} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600" aria-label="Manage friends" title="Manage friends"><Pencil size={17} /></button>
              <button type="button" onClick={() => { setShowAddFriend((current) => !current); setShowRequests(false); }} className="grid h-10 w-10 place-items-center rounded-xl border border-orange-200 bg-orange-50 text-orange-600 transition hover:-translate-y-0.5 hover:bg-orange-100" aria-label="Add a friend" title="Add a friend"><UserPlus size={18} /></button>
              <button type="button" onClick={() => { setShowRequests((current) => !current); setShowAddFriend(false); }} className="relative grid h-10 w-10 place-items-center rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-700 transition hover:-translate-y-0.5 hover:bg-cyan-100" aria-label="Friend requests" title="Friend requests"><Inbox size={18} />{friendRequests.length > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-black text-white">{friendRequests.length}</span>}</button>
            </div>
          </div>
          <AnimatePresence>
            {showAddFriend && <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setShowAddFriend(false)}><motion.form onSubmit={(event) => event.preventDefault()} initial={{ opacity: 0, y: 18, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .96 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }} className="relative w-full max-w-md rounded-[1.75rem] border border-orange-200 bg-white p-5 shadow-[0_25px_90px_rgba(15,23,42,.24)]">
              <button type="button" onClick={() => setShowAddFriend(false)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-orange-50 text-orange-600" aria-label="Close add friend dialog"><X size={18} /></button>
              <p className="text-[10px] font-black uppercase tracking-[.24em] text-orange-600">Your squad</p><h3 className="mt-1 text-2xl font-black text-slate-950">Add a friend</h3><p className="mt-1 text-sm font-semibold text-slate-500">Search with their Battle GameID or user ID.</p>
              <div className="relative mt-5"><UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400" size={18} /><input value={gameId} onChange={(event) => setGameId(event.target.value)} maxLength={40} placeholder="Enter Battle GameID or user ID" className="h-12 w-full rounded-2xl border border-orange-100 bg-orange-50/40 pl-11 pr-4 text-sm font-bold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" autoFocus /></div>
              <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto">
                {searchingStudents ? <p className="rounded-xl bg-orange-50 p-4 text-center text-xs font-bold text-orange-600">Searching students...</p> : gameId.trim().length < 2 ? null : searchResults.length ? searchResults.map((student) => <div key={student.id} className="flex items-center gap-3 rounded-xl border border-orange-100 bg-[#fffaf5] p-3"><div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-orange-100 font-black text-orange-600">{student.profileImageUrl ? <img src={assetUrl(student.profileImageUrl)} alt="" className="h-full w-full object-cover" /> : student.name?.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-950">{student.name}</p><p className="text-[10px] font-bold text-slate-400">{student.gameId} · {student.online ? 'Online' : 'Offline'}</p></div>{student.relationship === 'friends' ? <span className="text-xs font-black text-emerald-600">Already friends</span> : student.relationship === 'pending' ? <span className="text-xs font-black text-orange-600">Request sent</span> : student.relationship === 'incoming' ? <span className="text-xs font-black text-cyan-600">Check requests</span> : <button type="button" onClick={() => sendFriendRequest(student)} disabled={requestAction === student.id} className="rounded-xl bg-slate-900 px-3 py-2 text-[10px] font-black text-white transition hover:bg-orange-600 disabled:opacity-50">Send</button>}</div>) : <p className="rounded-xl bg-rose-50 p-4 text-center text-xs font-bold text-rose-600">No students found.</p>}
              </div>
            </motion.form></div>}
          </AnimatePresence>
          {(error || message) && (
            <p
              className={`mt-3 text-sm font-bold ${error ? "text-rose-600" : "text-emerald-600"}`}
            >
              {error || message}
            </p>
          )}
          <AnimatePresence>
          {showRequests && <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setShowRequests(false)}><motion.div initial={{ opacity: 0, y: 18, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .96 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }} className="w-full max-w-md rounded-[1.75rem] border border-cyan-100 bg-white p-5 shadow-[0_25px_90px_rgba(15,23,42,.24)]">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-700">Squad inbox</p><h3 className="mt-1 text-lg font-black text-slate-950">Friend requests</h3></div><button type="button" onClick={() => setShowRequests(false)} className="grid h-8 w-8 place-items-center rounded-full bg-white text-slate-500" aria-label="Close requests"><X size={16} /></button></div>
            <div className="mt-3 grid gap-2">
              {friendRequests.length ? friendRequests.map((request) => <div key={request.id} className="flex items-center gap-3 rounded-xl border border-cyan-100 bg-white p-3"><div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-orange-100 font-black text-orange-600">{request.sender.profileImageUrl ? <img src={assetUrl(request.sender.profileImageUrl)} alt="" className="h-full w-full object-cover" /> : request.sender.name?.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-950">{request.sender.name}</p><p className="text-[10px] font-bold text-slate-400">{request.sender.online ? 'Online now' : 'Wants to join your squad'}</p></div><button type="button" onClick={() => respondToFriendRequest(request, 'accepted')} disabled={requestAction === request.id} className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500 text-white disabled:opacity-50" aria-label={`Accept ${request.sender.name}`}><Check size={17} /></button><button type="button" onClick={() => respondToFriendRequest(request, 'rejected')} disabled={requestAction === request.id} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 disabled:opacity-50" aria-label={`Reject ${request.sender.name}`}><X size={17} /></button></div>) : <p className="rounded-xl bg-white p-3 text-center text-xs font-bold text-slate-400">No pending requests.</p>}
            </div>
          </motion.div></div>}
          </AnimatePresence>
          <AnimatePresence>
          {showManageFriends && <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setShowManageFriends(false)}><motion.div initial={{ opacity: 0, y: 18, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .96 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }} className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_25px_90px_rgba(15,23,42,.24)]">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-orange-600">Your squad</p><h3 className="mt-1 text-2xl font-black text-slate-950">Manage friends</h3></div><button type="button" onClick={() => setShowManageFriends(false)} className="grid h-9 w-9 place-items-center rounded-full bg-orange-50 text-orange-600" aria-label="Close manage friends"><X size={18} /></button></div>
            <div className="mt-4 grid max-h-[min(60vh,28rem)] gap-2 overflow-y-auto">{friends.length ? friends.map((friend) => <div key={friend.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"><div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-orange-100 font-black text-orange-600">{friend.profileImageUrl ? <img src={assetUrl(friend.profileImageUrl)} alt="" className="h-full w-full object-cover" /> : friend.name?.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-950">{friend.name}</p><p className="text-[10px] font-bold text-slate-400">{friend.online ? 'Online' : 'Offline'} · {friend.gameId}</p></div><button type="button" onClick={() => removeFriend(friend)} disabled={removingFriend === friend.id} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-black text-rose-600 transition hover:bg-rose-100 disabled:opacity-50">{removingFriend === friend.id ? 'Removing...' : 'Remove'}</button></div>) : <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-400">No friends to manage.</p>}</div>
          </motion.div></div>}
          </AnimatePresence>
          <div className="mt-6 grid gap-3">
            {friends.length ? (
              friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3"
                >
                  <div className="battle-friend-avatar grid h-11 w-11 place-items-center rounded-xl bg-orange-100 font-black text-orange-600">
                    {friend.profileImageUrl ? <img src={assetUrl(friend.profileImageUrl)} alt={`${friend.name} Battle profile`} /> : friend.name?.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black">{friend.name}</p>
                    <p className="text-xs font-bold text-slate-400">
                      {friend.gameId}
                    </p>
                  </div>
                  <span
                    className={`h-3 w-3 rounded-full ${friend.online ? "bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,.14)]" : "bg-slate-300"}`}
                    title={friend.online ? "Online" : "Offline"}
                  />
                  <span className="hidden text-xs font-black uppercase tracking-widest text-slate-400 sm:inline">
                    {friend.online ? "Online" : "Offline"}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-orange-200 px-5 py-8 text-center text-sm font-bold text-slate-400">
                <Gamepad2 className="mx-auto mb-2 text-orange-300" size={25} />
                Your friend list is empty. Add a friend by their GameID to start
                your squad.
              </div>
            )}
          </div>
        </section>
        <div className="mt-5 flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
          <Zap size={14} className="text-orange-400" /> Socket-powered presence
          updates automatically
        </div>
        <BattleBottomNav />
      </div>
    </section>
  );
};

export default BattleModeHome;
