import { useState, useEffect, useRef, useCallback } from "react";

/**
 * AgentChat -- Integrated AI agent chat panel for Natillera On-Chain.
 *
 * Design decisions:
 * - Fixed bottom-sheet pattern chosen over modal or sidebar because this app
 *   runs inside Farcaster frames on mobile where screen real-estate is limited
 *   and thumb-reachability matters.
 * - Positioned above the existing bottom nav (56px) so it doesn't conflict
 *   with Layout.jsx navigation.
 * - Dark glass-morphism aesthetic (#0a0f1a base) to match DeFi conventions
 *   while keeping Celo green (#35D07F) as the accent.
 * - Quick-action chips reduce typing on mobile and guide first-time users
 *   toward the agent's capabilities.
 * - All styles are inline to keep the component fully self-contained.
 */

const CELO_GREEN = "#35D07F";
const CELO_GREEN_DIM = "rgba(53, 208, 127, 0.12)";
const CELO_GREEN_HOVER = "rgba(53, 208, 127, 0.18)";
const BG_PANEL = "#0d1424";
const BG_DARK = "#0a0f1a";
const BG_MESSAGE_AGENT = "#141c2e";
const BG_INPUT = "#141c2e";
const BORDER_COLOR = "rgba(53, 208, 127, 0.15)";
const TEXT_PRIMARY = "#f0f2f5";
const TEXT_SECONDARY = "#8892a4";
const BOTTOM_NAV_HEIGHT = 56; // matches Layout.jsx bottom nav

const API_URL = "https://natillera-frame.vercel.app/api/chat";

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "agent",
  text: "Hey! I'm Natillera Agent #12 — autonomous on Celo Mainnet. I manage 4 active rotating savings groups. What would you like to know?",
};

const QUICK_ACTIONS = [
  "What groups are active?",
  "How do I join?",
  "Contract status",
];

// ── Inline style objects ────────────────────────────────────────────────

const styles = {
  /** Outer wrapper -- always present, handles positioning */
  wrapper: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: BOTTOM_NAV_HEIGHT,
    zIndex: 40,
    pointerEvents: "none", // pass-through except for children
  },

  /** The panel itself (collapsed or expanded) */
  panel: (expanded) => ({
    pointerEvents: "auto",
    maxHeight: expanded ? "60vh" : 0,
    overflow: "hidden",
    transition: "max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
    background: BG_PANEL,
    borderTop: `1px solid ${BORDER_COLOR}`,
    display: "flex",
    flexDirection: "column",
  }),

  /** Collapsed toggle bar */
  toggleBar: {
    pointerEvents: "auto",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 16px",
    background: BG_DARK,
    borderTop: `1px solid ${BORDER_COLOR}`,
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    transition: "background 0.15s ease",
  },

  toggleBarIcon: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: CELO_GREEN_DIM,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  toggleBarLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: 600,
    color: TEXT_PRIMARY,
    lineHeight: 1.3,
  },

  toggleBarHint: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },

  chevron: (expanded) => ({
    width: 20,
    height: 20,
    color: TEXT_SECONDARY,
    transition: "transform 0.3s ease",
    transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
    flexShrink: 0,
  }),

  /** Messages scroll area */
  messagesArea: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 16px 8px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    WebkitOverflowScrolling: "touch",
  },

  /** Individual message bubble */
  bubble: (isUser) => ({
    maxWidth: "82%",
    alignSelf: isUser ? "flex-end" : "flex-start",
    background: isUser ? CELO_GREEN : BG_MESSAGE_AGENT,
    color: isUser ? BG_DARK : TEXT_PRIMARY,
    padding: "10px 14px",
    borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
    fontSize: 14,
    lineHeight: 1.5,
    wordBreak: "break-word",
    border: isUser ? "none" : `1px solid ${BORDER_COLOR}`,
    animation: "agentchat-fadein 0.2s ease",
  }),

  /** Typing indicator dots container */
  typingContainer: {
    maxWidth: "82%",
    alignSelf: "flex-start",
    background: BG_MESSAGE_AGENT,
    border: `1px solid ${BORDER_COLOR}`,
    padding: "12px 18px",
    borderRadius: "16px 16px 16px 4px",
    display: "flex",
    gap: 5,
    alignItems: "center",
  },

  typingDot: (delay) => ({
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: CELO_GREEN,
    opacity: 0.5,
    animation: `agentchat-bounce 1.2s ${delay}s infinite ease-in-out`,
  }),

  /** Quick-action chips row */
  chipsRow: {
    display: "flex",
    gap: 8,
    padding: "4px 16px 8px",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
    scrollbarWidth: "none", // Firefox
    msOverflowStyle: "none", // IE
  },

  chip: {
    flexShrink: 0,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 500,
    color: CELO_GREEN,
    background: CELO_GREEN_DIM,
    border: `1px solid ${BORDER_COLOR}`,
    borderRadius: 20,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "background 0.15s ease, border-color 0.15s ease",
    WebkitTapHighlightColor: "transparent",
  },

  chipHover: {
    background: CELO_GREEN_HOVER,
    borderColor: "rgba(53, 208, 127, 0.35)",
  },

  /** Input footer area */
  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px 12px",
    borderTop: `1px solid ${BORDER_COLOR}`,
    background: BG_DARK,
  },

  input: {
    flex: 1,
    padding: "10px 14px",
    fontSize: 14,
    color: TEXT_PRIMARY,
    background: BG_INPUT,
    border: `1px solid ${BORDER_COLOR}`,
    borderRadius: 12,
    outline: "none",
    transition: "border-color 0.15s ease",
    lineHeight: 1.4,
    minHeight: 42,
  },

  inputFocused: {
    borderColor: CELO_GREEN,
    boxShadow: `0 0 0 2px ${CELO_GREEN_DIM}`,
  },

  sendButton: (canSend) => ({
    width: 42,
    height: 42,
    borderRadius: 12,
    border: "none",
    background: canSend ? CELO_GREEN : CELO_GREEN_DIM,
    color: canSend ? BG_DARK : TEXT_SECONDARY,
    cursor: canSend ? "pointer" : "default",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "background 0.15s ease, transform 0.1s ease",
    WebkitTapHighlightColor: "transparent",
  }),

  /** Error toast */
  errorToast: {
    margin: "0 16px 8px",
    padding: "8px 12px",
    fontSize: 13,
    color: "#fca5a5",
    background: "rgba(239, 68, 68, 0.12)",
    border: "1px solid rgba(239, 68, 68, 0.25)",
    borderRadius: 10,
    textAlign: "center",
  },
};

// ── Keyframe injection (runs once) ──────────────────────────────────────

let keyframesInjected = false;

function injectKeyframes() {
  if (keyframesInjected) return;
  keyframesInjected = true;

  const sheet = document.createElement("style");
  sheet.textContent = `
    @keyframes agentchat-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }
    @keyframes agentchat-fadein {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .agentchat-chips-row::-webkit-scrollbar { display: none; }
  `;
  document.head.appendChild(sheet);
}

// ── SVG icons ───────────────────────────────────────────────────────────

function AgentIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={CELO_GREEN}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Robot / agent head */}
      <rect x="4" y="8" width="16" height="12" rx="3" />
      <circle cx="9" cy="14" r="1.5" fill={CELO_GREEN} stroke="none" />
      <circle cx="15" cy="14" r="1.5" fill={CELO_GREEN} stroke="none" />
      <path d="M10 18h4" />
      <path d="M12 2v4" />
      <path d="M8 6h8" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

function ChevronIcon({ style }) {
  return (
    <svg
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Unique ID helper ────────────────────────────────────────────────────

let _msgId = 0;
function nextId() {
  _msgId += 1;
  return `msg-${_msgId}-${Date.now()}`;
}

// ── Component ───────────────────────────────────────────────────────────

export default function AgentChat() {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [hoveredChip, setHoveredChip] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Inject keyframe animations on mount + listen for external open event
  useEffect(() => {
    injectKeyframes();

    const handleOpen = () => setExpanded(true);
    window.addEventListener("openAgentChat", handleOpen);
    return () => window.removeEventListener("openAgentChat", handleOpen);
  }, []);

  // Auto-scroll to newest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  // Focus input when panel expands
  useEffect(() => {
    if (expanded && inputRef.current) {
      // Small delay lets the CSS transition start so the input is visible
      const timer = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
  }, [expanded]);

  // ── Send logic ──────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = (text ?? input).trim();
      if (!trimmed || loading) return;

      // Clear any previous error
      setError(null);

      // Append user message
      const userMsg = { id: nextId(), role: "user", text: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        // Build history for context (exclude welcome message, convert roles)
        const history = messages
          .filter((m) => m.id !== "welcome")
          .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));

        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, history }),
        });

        if (!res.ok) {
          throw new Error(`Error ${res.status}`);
        }

        const data = await res.json();

        const agentMsg = {
          id: nextId(),
          role: "agent",
          text: data.reply || "No obtuve una respuesta. Intenta de nuevo.",
        };
        setMessages((prev) => [...prev, agentMsg]);
      } catch (err) {
        setError("No pude conectar con el agente. Verifica tu conexion e intenta de nuevo.");
        console.error("AgentChat fetch error:", err);
      } finally {
        setLoading(false);
      }
    },
    [input, loading],
  );

  // ── Key handler ─────────────────────────────────────────────────────

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Quick action chip click ─────────────────────────────────────────

  const handleChip = (text) => {
    if (loading) return;
    sendMessage(text);
  };

  // ── Toggle bar click ────────────────────────────────────────────────

  const togglePanel = () => setExpanded((prev) => !prev);

  // ── Determine if we should show chips ───────────────────────────────
  // Show quick actions only when there are few messages and user hasn't
  // started a deep conversation yet.
  const showChips = messages.length <= 3 && !loading;

  // ── Can we send? ────────────────────────────────────────────────────
  const canSend = input.trim().length > 0 && !loading;

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div style={styles.wrapper} role="complementary" aria-label="Natillera Agent chat">
      {/* ── Expandable panel ──────────────────────────────────────── */}
      <div style={styles.panel(expanded)}>
        {/* Messages */}
        <div style={styles.messagesArea} role="log" aria-live="polite" aria-label="Mensajes del chat">
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={styles.bubble(msg.role === "user")}
              role={msg.role === "agent" ? "status" : undefined}
            >
              {msg.text}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={styles.typingContainer} aria-label="El agente esta escribiendo">
              <div style={styles.typingDot(0)} />
              <div style={styles.typingDot(0.15)} />
              <div style={styles.typingDot(0.3)} />
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Error toast */}
        {error && (
          <div style={styles.errorToast} role="alert">
            {error}
          </div>
        )}

        {/* Quick action chips */}
        {showChips && (
          <div style={styles.chipsRow} className="agentchat-chips-row">
            {QUICK_ACTIONS.map((text) => (
              <button
                key={text}
                type="button"
                style={{
                  ...styles.chip,
                  ...(hoveredChip === text ? styles.chipHover : {}),
                }}
                onMouseEnter={() => setHoveredChip(text)}
                onMouseLeave={() => setHoveredChip(null)}
                onClick={() => handleChip(text)}
                aria-label={`Preguntar: ${text}`}
              >
                {text}
              </button>
            ))}
          </div>
        )}

        {/* Input row */}
        <div style={styles.inputRow}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="Ask me anything..."
            style={{
              ...styles.input,
              ...(inputFocused ? styles.inputFocused : {}),
            }}
            aria-label="Mensaje para el agente"
            autoComplete="off"
          />
          <button
            type="button"
            style={styles.sendButton(canSend)}
            onClick={() => sendMessage()}
            disabled={!canSend}
            aria-label="Enviar mensaje"
          >
            <SendIcon />
          </button>
        </div>
      </div>

      {/* ── Collapsed toggle bar ──────────────────────────────────── */}
      <div
        style={styles.toggleBar}
        onClick={togglePanel}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            togglePanel();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls="agentchat-panel"
        aria-label={expanded ? "Cerrar chat del agente" : "Abrir chat del agente"}
      >
        <div style={styles.toggleBarIcon}>
          <AgentIcon size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={styles.toggleBarLabel}>Natillera Agent</div>
          {!expanded && (
            <div style={styles.toggleBarHint}>Ask about the savings groups</div>
          )}
        </div>
        <ChevronIcon style={styles.chevron(expanded)} />
      </div>
    </div>
  );
}
