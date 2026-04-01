import { useState, useEffect } from "react";
import { supabase } from './supabase.js';

const T = {
  green: "#2D6A4F", greenL: "#40916C", greenP: "#D8F3DC",
  earth: "#7F5539", earthL: "#B08968", earthP: "#F5ECD7",
  sky: "#1B4965", skyL: "#5FA8D3",
  cream: "#FEFAE0", white: "#FFFFFF",
  gray: "#6B7280", grayL: "#F3F4F6",
  danger: "#DC2626", warn: "#D97706",
  indigo: "#6366F1", amber: "#F59E0B",
};

const today = new Date();
const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日（${["日","月","火","水","木","金","土"][today.getDay()]}）`;

const BIZ = [
  { id: "honbu",  icon: "🏢", label: "本部",     color: T.indigo,
    tasks: ["会議・打ち合わせ", "事務作業", "移動", "計画・検討", "その他"], meetingMode: true },
  { id: "makusa", icon: "🌿", label: "牧草",      color: T.green,
    tasks: ["刈り取り", "運搬", "乾燥・梱包", "トラクター", "畦作業", "除草作業", "農薬散布", "肥料散布", "打ち合わせ", "移動", "その他"] },
  { id: "compost",icon: "🪣", label: "堆肥",      color: T.earth,
    tasks: ["堆肥製造", "堆肥散布", "原料管理", "トラクター", "肥料散布", "打ち合わせ", "移動", "その他"] },
  { id: "rice",   icon: "🌾", label: "米",        color: T.skyL,
    tasks: ["田植え", "水管理", "施肥", "収穫", "選別", "乾燥・調整", "トラクター", "除草作業", "農薬散布", "肥料散布", "打ち合わせ", "移動", "その他"] },
  { id: "food",   icon: "🏭", label: "食品加工",  color: T.earthL,
    tasks: ["製造", "梱包", "品質管理", "衛生管理", "選別", "打ち合わせ", "移動", "その他"] },
  { id: "chiku",  icon: "🐄", label: "畜産",      color: T.amber,
    tasks: ["飼育管理", "餌やり", "繁殖管理", "衛生・清掃", "剪定", "収穫", "打ち合わせ", "移動", "その他"] },
  { id: "kuri",   icon: "🌰", label: "丹波栗",    color: "#92400E",
    tasks: ["除草", "農薬散布", "肥料散布", "剪定", "収穫", "選別", "打ち合わせ", "その他"] },
];
const MEETING_PARTNERS = ["社内メンバー", "取引先", "行政・農協", "金融機関", "その他"];

function toMin(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}
function durationLabel(s, e) {
  const diff = toMin(e) - toMin(s);
  if (diff <= 0) return "";
  const h = Math.floor(diff / 60), m = diff % 60;
  return h > 0 ? (m > 0 ? `${h}時間${m}分` : `${h}時間`) : `${m}分`;
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: T.white, borderRadius: 16, padding: "14px 16px",
      boxShadow: "0 2px 12px rgba(45,106,79,0.08)", ...style }}>
      {children}
    </div>
  );
}
function Tag({ label, color = T.green, bg = T.greenP }) {
  return (
    <span style={{ background: bg, color, borderRadius: 20, padding: "2px 10px",
      fontSize: 11, fontWeight: 700, fontFamily: "'Noto Sans JP', sans-serif" }}>
      {label}
    </span>
  );
}
function NavBar({ cur, onNav }) {
  const items = [
    { id: "home",    icon: "🏠", label: "ホーム" },
    { id: "clock",   icon: "⏱",  label: "出退勤" },
    { id: "work",    icon: "🌾", label: "作業記録" },
    { id: "journal", icon: "📋", label: "日誌" },
    { id: "leave",   icon: "📅", label: "有給" },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%",
      transform: "translateX(-50%)",
      width: 359, // phone frame width minus borders
      background: T.white,
      borderTop: `1.5px solid ${T.greenP}`,
      display: "flex", justifyContent: "space-around",
      padding: "8px 0 14px",
      zIndex: 1000,
      boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
    }}>
      {items.map(it => (
        <button key={it.id} onClick={() => onNav(it.id)} style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          background: "none", border: "none", cursor: "pointer", gap: 2, minWidth: 48,
        }}>
          <span style={{ fontSize: 20 }}>{it.icon}</span>
          <span style={{ fontSize: 10, fontFamily: "'Noto Sans JP', sans-serif",
            fontWeight: cur === it.id ? 700 : 400,
            color: cur === it.id ? T.green : T.gray }}>
            {it.label}
          </span>
          {cur === it.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.green }} />}
        </button>
      ))}
    </div>
  );
}

// ── HOME ──
function HomeScreen({ posts, markRead, onNav, currentUser, memberNames }) {
  const ME = currentUser?.name || "";
  const importantUnread = posts.filter(p => p.tag === "重要" && !p.readBy.includes(ME));
  const recentPosts = posts.slice(0, 3);
  return (
    <div style={{ padding: "16px 14px 100px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: `linear-gradient(135deg,${T.green},${T.greenL})`,
        borderRadius: 20, padding: "16px 18px", color: T.white, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -20, top: -20, width: 100, height: 100,
          borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ fontSize: 11, opacity: 0.75, fontFamily: "'Noto Sans JP', sans-serif", marginBottom: 2 }}>
          関わるすべてに喜びを 🌾
        </div>
        <div style={{ fontSize: 11, opacity: 0.85, fontFamily: "'Noto Sans JP', sans-serif" }}>{dateStr}</div>
        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, fontFamily: "'Noto Sans JP', sans-serif" }}>
          おはようございます 👋
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          {[["今月の勤務","0h"],["有給残日数","—"],["今日の作業","0件"]].map(([k,v],i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.18)", borderRadius: 12,
              padding: "8px 10px", flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 10, opacity: 0.8, fontFamily: "'Noto Sans JP', sans-serif" }}>{k}</div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Noto Sans JP', sans-serif" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ⚠️ 重要・未読バナー（全員確認するまで消えない） */}
      {importantUnread.map(p => (
        <div key={p.id} style={{
          background: `${T.danger}11`, border: `2px solid ${T.danger}`,
          borderRadius: 14, padding: "12px 14px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>🚨</span>
            <span style={{ fontWeight: 800, fontSize: 13, color: T.danger,
              fontFamily: "'Noto Sans JP', sans-serif", flex: 1 }}>重要・要確認</span>
            <span style={{ fontSize: 10, color: T.gray, fontFamily: "'Noto Sans JP', sans-serif" }}>
              確認済 {p.readBy.length}/{MEMBERS.length}人
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#374151", fontFamily: "'Noto Sans JP', sans-serif",
            lineHeight: 1.6, marginBottom: 8 }}>{p.content}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {memberNames.map(m => (
              <div key={m} style={{
                background: p.readBy.includes(m) ? T.greenP : T.grayL,
                borderRadius: 20, padding: "3px 10px", fontSize: 10,
                color: p.readBy.includes(m) ? T.green : T.gray,
                fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 700,
              }}>
                {p.readBy.includes(m) ? "✅" : "⬜"} {m.split(" ")[0]}
              </div>
            ))}
          </div>
          {!p.readBy.includes(ME) && (
            <button onClick={() => markRead(p.id)} style={{
              background: T.danger, color: "white", border: "none",
              borderRadius: 10, padding: "8px 16px", fontSize: 12,
              fontWeight: 800, cursor: "pointer", fontFamily: "'Noto Sans JP', sans-serif",
              width: "100%", zIndex: 10, position: "relative",
            }}>✅ 確認しました</button>
          )}
        </div>
      ))}

      {/* 出退勤 */}
      <Card>
        <div style={{ fontWeight: 700, fontSize: 13, color: T.green, fontFamily: "'Noto Sans JP', sans-serif", marginBottom: 10 }}>📍 本日の出退勤</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: T.grayL,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>⏱</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "'Noto Sans JP', sans-serif", color: T.gray }}>未出勤</div>
            <div style={{ fontSize: 11, color: T.gray, fontFamily: "'Noto Sans JP', sans-serif" }}>出退勤タブから打刻してください</div>
          </div>
        </div>
      </Card>

      {/* 最新の日誌・連絡 */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: T.green, fontFamily: "'Noto Sans JP', sans-serif" }}>
            🔔 最新の連絡事項
          </div>
          <button onClick={() => onNav("journal")} style={{
            background: "none", border: "none", fontSize: 11, color: T.skyL,
            cursor: "pointer", fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 700,
            zIndex: 10, position: "relative",
          }}>すべて見る →</button>
        </div>
        {recentPosts.map((p, i) => (
          <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "flex-start",
            padding: "8px 0", borderBottom: i < recentPosts.length - 1 ? `1px solid ${T.grayL}` : "none" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, flexShrink: 0, marginTop: 5 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                <Tag label={p.tag} color={p.color} bg={`${p.color}18`} />
                <span style={{ fontSize: 10, color: T.gray, fontFamily: "'Noto Sans JP', sans-serif" }}>{p.name} · {p.time}</span>
              </div>
              <div style={{ fontSize: 12, fontFamily: "'Noto Sans JP', sans-serif", color: "#374151",
                overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                {p.content}
              </div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── CLOCK ──
function ClockScreen() {
  const [clocked, setClocked] = useState(true);
  return (
    <div style={{ padding: "16px 14px 100px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 18, color: T.green, fontFamily: "'Noto Sans JP', sans-serif" }}>⏱ 出退勤</div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ height: 150, background: "linear-gradient(160deg,#c8e6c9,#a5d6a7,#66bb6a)",
          position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {[0,1,2,3].map(i => <div key={i} style={{ position: "absolute", left: `${i*33}%`, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.3)" }} />)}
          {[0,1,2].map(i => <div key={i} style={{ position: "absolute", top: `${i*50}%`, left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.3)" }} />)}
          <div style={{ textAlign: "center" }}>
            <div style={{ background: T.green, color: "white", borderRadius: "50% 50% 50% 0",
              transform: "rotate(-45deg)", width: 34, height: 34, display: "flex",
              alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", margin: "0 auto" }}>
              <span style={{ transform: "rotate(45deg)", fontSize: 16 }}>📍</span>
            </div>
            <div style={{ marginTop: 4, background: "rgba(255,255,255,0.9)", borderRadius: 8,
              padding: "2px 8px", fontSize: 11, fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 700 }}>牧草圃場 第1区画</div>
          </div>
        </div>
        <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <span>📍</span>
          <span style={{ fontSize: 11, fontFamily: "'Noto Sans JP', sans-serif", color: T.gray }}>現在地: 北海道〇〇市〇〇町 牧草圃場エリア</span>
        </div>
      </Card>
      <Card style={{ textAlign: "center", padding: "20px 14px" }}>
        <div style={{ fontSize: 11, color: T.gray, fontFamily: "'Noto Sans JP', sans-serif" }}>現在のステータス</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: clocked ? T.green : T.gray, fontFamily: "'Noto Sans JP', sans-serif" }}>
          {clocked ? "🟢 勤務中" : "⚫ 退勤済み"}
        </div>
        {clocked && <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 2, margin: "10px 0", fontFamily: "monospace" }}>07:00 〜 <span style={{ color: T.green }}>進行中</span></div>}
        <button onClick={() => setClocked(!clocked)} style={{
          marginTop: 8,
          background: clocked ? `linear-gradient(135deg,${T.danger},#EF4444)` : `linear-gradient(135deg,${T.green},${T.greenL})`,
          color: "white", border: "none", borderRadius: 50,
          padding: "14px 44px", fontSize: 17, fontWeight: 800, cursor: "pointer",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)", fontFamily: "'Noto Sans JP', sans-serif",
        }}>{clocked ? "退勤する" : "出勤する"}</button>
      </Card>
      <Card>
        <div style={{ fontWeight: 700, fontSize: 13, color: T.green, fontFamily: "'Noto Sans JP', sans-serif", marginBottom: 10 }}>📜 今週の履歴</div>
        {[].map((r,i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10,
            padding: "8px 0", borderBottom: i < 2 ? `1px solid ${T.grayL}` : "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8,
              background: r.hours ? T.greenP : T.earthP,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 13, color: r.hours ? T.green : T.earth,
              fontFamily: "'Noto Sans JP', sans-serif" }}>{r.day}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontFamily: "'Noto Sans JP', sans-serif" }}>{r.in} 〜 {r.out}</div>
              <div style={{ fontSize: 10, color: T.gray, fontFamily: "'Noto Sans JP', sans-serif" }}>📍 {r.loc}</div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.green, fontFamily: "'Noto Sans JP', sans-serif" }}>
              {r.hours ? `${r.hours}h` : "勤務中"}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── WORK (QUICK ONE-SCREEN) ──
const CLOCKIN = "07:00";
const DAY_END = "20:00";
const PX = 0.6;

function WorkScreen({ currentUser }) {
  // 日付管理
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  })();
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    const diff = Math.round((new Date(todayStr) - d) / 86400000);
    const dayNames = ["日","月","火","水","木","金","土"];
    const label = `${d.getMonth()+1}/${d.getDate()}（${dayNames[d.getDay()]}）`;
    if (diff === 0) return `今日 ${label}`;
    if (diff === 1) return `昨日 ${label}`;
    if (diff === -1) return `明日 ${label}`;
    return label;
  };

  const goDate = (delta) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    const str = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    setSelectedDate(str);
    setBlocks([]);
    setDayLocked(false);
    setOpen(true);
    setDraft({ bizId: null, task: null, meetWith: null, endTime: null });
  };

  const [blocks, setBlocks] = useState([]);
  const [open, setOpen]      = useState(true);
  const [tab, setTab]        = useState("today");
  const [dayLocked, setDayLocked] = useState(false); // その日全体の確定フラグ
  const [draft, setDraft]    = useState({ bizId: null, task: null, meetWith: null, endTime: null });

  const nextStart = blocks.length > 0 ? blocks[blocks.length - 1].end : CLOCKIN;
  const bizOf     = id => BIZ.find(b => b.id === id);
  const selBiz    = bizOf(draft.bizId);
  const isMeeting = selBiz?.meetingMode && draft.task === "会議・打ち合わせ";
  const canRecord = draft.bizId && draft.task && draft.endTime && (!isMeeting || draft.meetWith);

  const endOptions = () => {
    const opts = [];
    let cur = toMin(nextStart) + 30;
    while (cur <= toMin(DAY_END)) { opts.push(toHHMM(cur)); cur += 30; }
    return opts;
  };

  const confirmBlock = () => {
    if (!canRecord) return;
    setBlocks(prev => [...prev, {
      start: nextStart, end: draft.endTime,
      bizId: draft.bizId, task: draft.task, meetWith: draft.meetWith, locked: false,
    }]);
    setDraft({ bizId: null, task: null, meetWith: null, endTime: null });
    setOpen(false); // 記録後はいったん閉じて「次を追加」ボタンを表示
  };

  // 1件だけ削除（一時保存中のみ可）
  const deleteBlock = (idx) => {
    if (dayLocked) return;
    setBlocks(prev => prev.filter((_, i) => i !== idx));
  };

  // その日全体を確定送信
  const confirmDay = () => {
    if (blocks.length === 0) return;
    setDayLocked(true);
    setOpen(false);
  };

  const dayStart = toMin(CLOCKIN);
  const totalMin = toMin(DAY_END) - dayStart;

  // 週次・月次・年次モックデータ
  const weeklyData = [
    { day: "月", works: [] },
    { day: "火", works: [] },
    { day: "水", works: [] },
    { day: "木", works: [] },
    { day: "金", works: [] },
    { day: "土", works: [] },
    { day: "日", works: [] },
  ];

  // 週次集計（事業別合計）
  const weeklyBizTotals = BIZ.map(b => {
    const total = weeklyData.flatMap(d => d.works).filter(w => w.bizId === b.id).reduce((a, w) => a + w.mins, 0);
    return { ...b, total };
  }).filter(b => b.total > 0);

  // 月次モック
  const monthlyBiz = [];
  const totalMonthly = 0;

  const yearlyBiz = [];
  const totalYearly = 0;

  // 年次モック（事業別年間合計）


  // タイムライン
  const TimelineBar = () => (
    <Card style={{ padding: "12px 10px" }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: T.green,
        fontFamily: "'Noto Sans JP', sans-serif", marginBottom: 8 }}>
        🕐 今日のタイムライン
      </div>
      <div style={{ display: "flex", gap: 0 }}>
        <div style={{ width: 34, flexShrink: 0, position: "relative", height: totalMin * PX + 16 }}>
          {Array.from({ length: Math.floor(totalMin / 60) + 1 }, (_, i) => {
            const h = Math.floor(dayStart / 60) + i;
            if (i % 2 !== 0) return null;
            return (
              <div key={i} style={{ position: "absolute", top: i * 60 * PX - 5,
                fontSize: 9, color: T.gray, fontFamily: "monospace" }}>
                {String(h).padStart(2, "0")}:00
              </div>
            );
          })}
        </div>
        <div style={{ flex: 1, position: "relative", height: totalMin * PX + 16 }}>
          {Array.from({ length: Math.floor(totalMin / 60) + 1 }, (_, i) => (
            <div key={i} style={{ position: "absolute", top: i * 60 * PX,
              left: 0, right: 0, height: 1, background: T.grayL }} />
          ))}
          {blocks.map((bl, idx) => {
            const top    = (toMin(bl.start) - dayStart) * PX;
            const height = (toMin(bl.end) - toMin(bl.start)) * PX;
            const b      = bizOf(bl.bizId);
            const col    = b?.color || T.green;
            return (
              <div key={idx} style={{
                position: "absolute", top, left: 2, right: 2, height,
                background: `${col}22`, border: `2px solid ${col}`,
                borderRadius: 6, padding: "1px 5px", overflow: "hidden",
                display: "flex", flexDirection: "column", justifyContent: "center",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: col,
                    fontFamily: "'Noto Sans JP', sans-serif",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                    {b?.icon} {bl.task}
                  </span>
                  {bl.locked && <span style={{ fontSize: 8 }}>🔒</span>}
                </div>
                {height > 30 && (
                  <div style={{ fontSize: 9, color: T.gray, fontFamily: "monospace" }}>
                    {bl.start}〜{bl.end}
                  </div>
                )}
              </div>
            );
          })}
          {/* 未記録 */}
          {(() => {
            const top    = (toMin(nextStart) - dayStart) * PX;
            const height = (toMin(DAY_END) - toMin(nextStart)) * PX;
            if (height <= 0) return null;
            return (
              <div style={{
                position: "absolute", top, left: 2, right: 2, height,
                background: "repeating-linear-gradient(45deg,#f9fafb,#f9fafb 4px,#f3f4f6 4px,#f3f4f6 8px)",
                borderRadius: 6, border: "1.5px dashed #d1d5db",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 9, color: T.gray, fontFamily: "'Noto Sans JP', sans-serif" }}>未記録</span>
              </div>
            );
          })()}
        </div>
      </div>
    </Card>
  );

  return (
    <div style={{ padding: "16px 14px 100px", display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ページヘッダー＋日付選択 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: T.green, fontFamily: "'Noto Sans JP', sans-serif" }}>
          📊 作業記録
        </div>
      </div>

      {/* 日付ナビゲーター */}
      <Card style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => goDate(-1)} style={{
            background: T.grayL, border: "none", borderRadius: 10,
            padding: "8px 14px", fontSize: 16, cursor: "pointer",
            fontWeight: 700, color: T.gray,
          }}>‹</button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: T.green,
              fontFamily: "'Noto Sans JP', sans-serif" }}>
              {formatDateLabel(selectedDate)}
            </div>
            {selectedDate !== todayStr && (
              <button style={{
                background: "none", border: "none", fontSize: 11,
                color: T.skyL, cursor: "pointer", fontFamily: "'Noto Sans JP', sans-serif",
                fontWeight: 700, marginTop: 2, textDecoration: "underline",
              }} onClick={() => { setSelectedDate(todayStr); setBlocks([]); setDayLocked(false); setOpen(true); setDraft({ bizId: null, task: null, meetWith: null, endTime: null }); }}>
                今日に戻る
              </button>
            )}
          </div>
          <button onClick={() => goDate(1)} style={{
            background: T.grayL, border: "none", borderRadius: 10,
            padding: "8px 14px", fontSize: 16, cursor: "pointer",
            fontWeight: 700, color: selectedDate >= todayStr ? "#ccc" : T.gray,
          }} disabled={selectedDate >= todayStr}>›</button>
        </div>
      </Card>

      {/* 使い方ガイド（常時表示） */}
      <div style={{
        background: `linear-gradient(135deg, ${T.green}11, ${T.green}22)`,
        border: `1.5px solid ${T.green}44`,
        borderRadius: 14, padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 22 }}>👇</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, color: T.green, fontFamily: "'Noto Sans JP', sans-serif" }}>
            1日の作業をここで記録します
          </div>
          <div style={{ fontSize: 11, color: T.gray, fontFamily: "'Noto Sans JP', sans-serif", marginTop: 2 }}>
            ① 事業 → ② 作業内容 → ③ 終了時間　の順に選ぶだけ！
          </div>
        </div>
      </div>

      {/* 記録フォーム or 追加ボタン（確定前のみ） */}
      {!dayLocked && (!open ? (
        <button onClick={() => setOpen(true)} style={{
          background: `linear-gradient(135deg,${T.green},${T.greenL})`,
          color: "white", border: "none", borderRadius: 16,
          padding: "16px", fontSize: 16, fontWeight: 800,
          cursor: "pointer", fontFamily: "'Noto Sans JP', sans-serif",
          boxShadow: `0 6px 20px ${T.green}55`,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <span style={{ fontSize: 22 }}>＋</span>
          {nextStart} からの作業を追加する
        </button>
      ) : (
        /* ── 1画面完結フォーム ── */
        <Card style={{ borderTop: `4px solid ${selBiz?.color || T.green}`, padding: "14px 12px", position: "relative", zIndex: 20 }}>

          {/* ヘッダー */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: selBiz?.color || T.green,
              fontFamily: "'Noto Sans JP', sans-serif" }}>
              {selBiz ? `${selBiz.icon} ${selBiz.label}` : "🕐 " + nextStart + "〜 何をしましたか？"}
            </div>
            <button onClick={() => { setOpen(false); setDraft({ bizId: null, task: null, meetWith: null, endTime: null }); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: T.gray }}>✕</button>
          </div>

          {/* ① 事業選択 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.gray,
              fontFamily: "'Noto Sans JP', sans-serif", marginBottom: 6, letterSpacing: 1 }}>
              ① 事業
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {BIZ.map(b => (
                <button key={b.id} onClick={() => setDraft(d => ({ ...d, bizId: b.id, task: null, meetWith: null, endTime: null }))}
                  style={{
                    background: draft.bizId === b.id ? b.color : T.grayL,
                    color: draft.bizId === b.id ? "white" : "#333",
                    border: "none", borderRadius: 12, padding: "10px 4px",
                    cursor: "pointer", display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 3,
                    boxShadow: draft.bizId === b.id ? `0 4px 12px ${b.color}55` : "none",
                    transition: "all 0.15s",
                    position: "relative", zIndex: 10, pointerEvents: "auto",
                  }}>
                  <span style={{ fontSize: 20 }}>{b.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Noto Sans JP', sans-serif" }}>{b.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ② 作業内容（事業選択後に表示） */}
          {selBiz && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.gray,
                fontFamily: "'Noto Sans JP', sans-serif", marginBottom: 6, letterSpacing: 1 }}>
                ② 作業内容
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selBiz.tasks.map(t => (
                  <button key={t} onClick={() => setDraft(d => ({ ...d, task: t, meetWith: null }))}
                    style={{
                      background: draft.task === t ? selBiz.color : T.grayL,
                      color: draft.task === t ? "white" : "#333",
                      border: "none", borderRadius: 20,
                      padding: "7px 14px", fontSize: 12, fontWeight: 700,
                      cursor: "pointer", fontFamily: "'Noto Sans JP', sans-serif",
                      boxShadow: draft.task === t ? `0 3px 10px ${selBiz.color}44` : "none",
                      transition: "all 0.15s",
                      position: "relative", zIndex: 10, pointerEvents: "auto",
                    }}>{t}</button>
                ))}
              </div>
            </div>
          )}

          {/* ③ 会議相手（会議・打ち合わせ選択時のみ） */}
          {isMeeting && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.gray,
                fontFamily: "'Noto Sans JP', sans-serif", marginBottom: 6, letterSpacing: 1 }}>
                ③ 会議の相手
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {MEETING_PARTNERS.map(p => (
                  <button key={p} onClick={() => setDraft(d => ({ ...d, meetWith: p }))}
                    style={{
                      background: draft.meetWith === p ? T.indigo : T.grayL,
                      color: draft.meetWith === p ? "white" : "#333",
                      border: "none", borderRadius: 20,
                      padding: "7px 14px", fontSize: 12, fontWeight: 700,
                      cursor: "pointer", fontFamily: "'Noto Sans JP', sans-serif",
                      transition: "all 0.15s",
                    }}>{p}</button>
                ))}
              </div>
            </div>
          )}

          {/* ④ 終了時間（作業選択後に表示） */}
          {draft.task && (!isMeeting || draft.meetWith) && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.gray,
                fontFamily: "'Noto Sans JP', sans-serif", marginBottom: 6, letterSpacing: 1 }}>
                {isMeeting ? "④" : "③"} 終了時間　<span style={{ fontFamily: "monospace", color: "#999" }}>開始 {nextStart}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 5 }}>
                {endOptions().slice(0, 16).map(t => (
                  <button key={t} onClick={() => setDraft(d => ({ ...d, endTime: t }))}
                    style={{
                      background: draft.endTime === t ? (selBiz?.color || T.green) : T.grayL,
                      color: draft.endTime === t ? "white" : "#333",
                      border: "none", borderRadius: 10,
                      padding: "9px 2px", fontSize: 12, fontWeight: 700,
                      cursor: "pointer", fontFamily: "monospace",
                      boxShadow: draft.endTime === t ? `0 3px 8px ${selBiz?.color || T.green}44` : "none",
                      transition: "all 0.15s",
                    }}>{t}</button>
                ))}
              </div>
            </div>
          )}

          {/* 記録ボタン */}
          <button onClick={confirmBlock} disabled={!canRecord} style={{
            background: canRecord
              ? `linear-gradient(135deg,${selBiz?.color || T.green},${selBiz?.color || T.green}cc)`
              : T.grayL,
            color: canRecord ? "white" : T.gray,
            border: "none", borderRadius: 14, padding: "14px",
            width: "100%", fontWeight: 800, fontSize: 14,
            cursor: canRecord ? "pointer" : "default",
            fontFamily: "'Noto Sans JP', sans-serif",
            boxShadow: canRecord ? `0 4px 16px ${selBiz?.color || T.green}44` : "none",
            transition: "all 0.2s",
          }}>
            {canRecord
              ? `✅ ${nextStart}〜${draft.endTime}（${durationLabel(nextStart, draft.endTime)}）を記録`
              : "上から順に選んでください"}
          </button>
        </Card>
      ))}

      {/* 記録済みリスト＋タイムライン（記録後に表示） */}
      {blocks.length > 0 && (
        <TimelineBar />
      )}

      {/* 👑 管理者専用：チーム全体の集計（栗原優介のみ表示） */}
      {currentUser?.name === "栗原 優介" && (
        <Card style={{ borderLeft: `4px solid ${T.indigo}` }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: T.indigo,
            fontFamily: "'Noto Sans JP', sans-serif", marginBottom: 12 }}>
            👑 チーム全体の稼働（今日）
          </div>

          {/* メンバー別 */}
          {[
            { name: "栗原 優介", icon: "👨‍🌾", mins: 0, color: T.green },
            { name: "栗原 直人", icon: "👨‍🌾", mins: 0, color: T.skyL },
            { name: "秋山 龍之介", icon: "👨‍🔧", mins: 0, color: T.amber },
          ].map((m, i) => {
            const h = Math.floor(m.mins / 60);
            const min = m.mins % 60;
            const pct = Math.round((m.mins / 480) * 100);
            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontFamily: "'Noto Sans JP', sans-serif" }}>
                    {m.icon} {m.name}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: m.color,
                    fontFamily: "'Noto Sans JP', sans-serif" }}>
                    {h}h{min > 0 ? `${min}m` : ""}
                  </span>
                </div>
                <div style={{ height: 7, background: T.grayL, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%",
                    background: m.color, borderRadius: 4 }} />
                </div>
              </div>
            );
          })}

          {/* 3人合計 */}
          <div style={{ marginTop: 10, padding: "10px 14px",
            background: `${T.indigo}11`, borderRadius: 10,
            display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'Noto Sans JP', sans-serif", fontSize: 13,
              fontWeight: 700, color: T.indigo }}>3人合計</span>
            <span style={{ fontFamily: "'Noto Sans JP', sans-serif", fontSize: 16,
              fontWeight: 800, color: T.indigo }}>
              0時間
            </span>
          </div>
        </Card>
      )}

      {/* 集計タブ */}
      <Card>
        {/* タブ切替 */}
        <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
          {[["today","今日"],["weekly","週次"],["monthly","月次"],["yearly","年次"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, background: tab === id ? T.green : T.grayL,
              color: tab === id ? "white" : T.gray,
              border: "none", borderRadius: 10, padding: "8px 2px",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Noto Sans JP', sans-serif",
            }}>{label}</button>
          ))}
        </div>

        {/* 今日 */}
        {tab === "today" && (
          <>
            {/* 確定状態バナー */}
            {dayLocked ? (
              <div style={{ background: T.greenP, borderRadius: 10, padding: "8px 12px",
                marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🔒</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.green,
                  fontFamily: "'Noto Sans JP', sans-serif" }}>
                  本日の記録は確定済みです
                </span>
              </div>
            ) : (
              <div style={{ background: "#FEF9C3", borderRadius: 10, padding: "8px 12px",
                marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>📝</span>
                <span style={{ fontSize: 12, color: T.warn, fontWeight: 700,
                  fontFamily: "'Noto Sans JP', sans-serif" }}>
                  一時保存中 ー 当日中は修正できます
                </span>
              </div>
            )}

            {blocks.map((bl, i) => {
              const b = bizOf(bl.bizId);
              const col = b?.color || T.green;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 0", borderBottom: i < blocks.length - 1 ? `1px solid ${T.grayL}` : "none" }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: col, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 12, fontFamily: "'Noto Sans JP', sans-serif" }}>
                    {b?.icon} {b?.label}・{bl.task}
                    {bl.meetWith && <span style={{ fontSize: 10, color: T.gray }}> ({bl.meetWith})</span>}
                  </div>
                  <div style={{ fontSize: 10, color: T.gray, fontFamily: "monospace" }}>{bl.start}〜{bl.end}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: col, minWidth: 36, textAlign: "right",
                    fontFamily: "'Noto Sans JP', sans-serif" }}>
                    {durationLabel(bl.start, bl.end)}
                  </div>
                  {/* 削除ボタン（確定前のみ） */}
                  {!dayLocked && (
                    <button onClick={() => deleteBlock(i)} style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 14, color: "#ccc", padding: "2px 4px",
                    }} title="削除">✕</button>
                  )}
                </div>
              );
            })}

            <div style={{ marginTop: 10, padding: "8px 12px", background: T.greenP,
              borderRadius: 10, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "'Noto Sans JP', sans-serif", fontSize: 13, fontWeight: 700, color: T.green }}>合計</span>
              <span style={{ fontFamily: "'Noto Sans JP', sans-serif", fontSize: 13, fontWeight: 800, color: T.green }}>
                {(() => {
                  const total = blocks.reduce((acc, bl) => acc + toMin(bl.end) - toMin(bl.start), 0);
                  const h = Math.floor(total / 60), m = total % 60;
                  return h > 0 ? (m > 0 ? `${h}時間${m}分` : `${h}時間`) : `${m}分`;
                })()}
              </span>
            </div>

            {/* 1日確定ボタン（確定前のみ） */}
            {!dayLocked && blocks.length > 0 && (
              <button onClick={confirmDay} style={{
                marginTop: 12,
                background: `linear-gradient(135deg, ${T.sky}, ${T.skyL})`,
                color: "white", border: "none", borderRadius: 12, padding: "13px",
                width: "100%", fontWeight: 800, fontSize: 14, cursor: "pointer",
                fontFamily: "'Noto Sans JP', sans-serif",
                boxShadow: `0 4px 16px ${T.sky}44`,
              }}>
                ✅ 本日の記録を確定・送信する
              </button>
            )}
          </>
        )}

        {/* 週次 */}
        {tab === "weekly" && (
          <>
            <div style={{ fontSize: 11, color: T.gray, fontFamily: "'Noto Sans JP', sans-serif", marginBottom: 10 }}>
              今週（月〜日）の作業内訳
            </div>

            {/* 曜日別リスト */}
            {weeklyData.map((day, i) => {
              const totalMins = day.works.reduce((a, w) => a + w.mins, 0);
              const isWeekend = day.day === "土" || day.day === "日";
              return (
                <div key={i} style={{
                  marginBottom: 8, borderRadius: 10, overflow: "hidden",
                  border: `1px solid ${isWeekend ? "#FEF3C7" : T.grayL}`,
                }}>
                  {/* 曜日ヘッダー */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 10px",
                    background: isWeekend ? "#FEF9C3" : T.grayL,
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: isWeekend ? T.warn : T.green,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 800, color: "white",
                      fontFamily: "'Noto Sans JP', sans-serif", flexShrink: 0,
                    }}>{day.day}</div>
                    {day.works.length === 0 ? (
                      <span style={{ fontSize: 11, color: T.gray, fontFamily: "'Noto Sans JP', sans-serif' " }}>休日</span>
                    ) : (
                      <>
                        {/* 積み上げバー */}
                        <div style={{ flex: 1, height: 10, borderRadius: 4, overflow: "hidden", display: "flex" }}>
                          {day.works.map((w, j) => {
                            const b = bizOf(w.bizId);
                            const pct = (w.mins / 660) * 100;
                            return <div key={j} style={{ width: `${pct}%`, background: b?.color, opacity: 0.85 }} />;
                          })}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.green, minWidth: 30,
                          fontFamily: "'Noto Sans JP', sans-serif" }}>
                          {Math.floor(totalMins / 60)}h{totalMins % 60 > 0 ? `${totalMins % 60}m` : ""}
                        </span>
                      </>
                    )}
                  </div>
                  {/* 作業詳細 */}
                  {day.works.length > 0 && (
                    <div style={{ padding: "4px 10px 6px" }}>
                      {day.works.map((w, j) => {
                        const b = bizOf(w.bizId);
                        return (
                          <div key={j} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0" }}>
                            <div style={{ width: 6, height: 6, borderRadius: 2, background: b?.color, flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 11, fontFamily: "'Noto Sans JP', sans-serif" }}>
                              {b?.icon} {b?.label}・{w.task}
                            </span>
                            <span style={{ fontSize: 11, color: b?.color, fontWeight: 700,
                              fontFamily: "'Noto Sans JP', sans-serif" }}>
                              {Math.floor(w.mins / 60) > 0 ? `${Math.floor(w.mins/60)}h` : ""}{w.mins % 60 > 0 ? `${w.mins%60}m` : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 週次 事業別合計 */}
            <div style={{ marginTop: 12, padding: "10px 12px", background: T.greenP, borderRadius: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: T.green,
                fontFamily: "'Noto Sans JP', sans-serif", marginBottom: 8 }}>
                今週の事業別合計
              </div>
              {weeklyBizTotals.map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 12 }}>{b.icon}</span>
                  <span style={{ flex: 1, fontSize: 11, fontFamily: "'Noto Sans JP', sans-serif" }}>{b.label}</span>
                  <div style={{ width: 80, height: 6, background: "white", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${(b.total / 660) * 100}%`, height: "100%", background: b.color, borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: b.color, minWidth: 28,
                    fontFamily: "'Noto Sans JP', sans-serif" }}>
                    {Math.floor(b.total / 60)}h
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 月次 */}
        {tab === "monthly" && (
          <>
            <div style={{ fontSize: 11, color: T.gray, fontFamily: "'Noto Sans JP', sans-serif", marginBottom: 10 }}>
              今月の事業別内訳
            </div>
            {monthlyBiz.map((item, i) => {
              const b = bizOf(item.bizId);
              const pct = Math.round((item.mins / totalMonthly) * 100);
              const h = Math.floor(item.mins / 60);
              return (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontFamily: "'Noto Sans JP', sans-serif" }}>
                      {b?.icon} {b?.label}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: b?.color,
                      fontFamily: "'Noto Sans JP', sans-serif" }}>
                      {h}h（{pct}%）
                    </span>
                  </div>
                  <div style={{ height: 7, background: T.grayL, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: b?.color, borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop: 10, padding: "8px 12px", background: T.greenP,
              borderRadius: 10, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "'Noto Sans JP', sans-serif", fontSize: 13, fontWeight: 700, color: T.green }}>月間合計</span>
              <span style={{ fontFamily: "'Noto Sans JP', sans-serif", fontSize: 13, fontWeight: 800, color: T.green }}>
                {Math.floor(totalMonthly / 60)}時間
              </span>
            </div>
          </>
        )}

        {/* 年次 */}
        {tab === "yearly" && (
          <>
            <div style={{ fontSize: 11, color: T.gray, fontFamily: "'Noto Sans JP', sans-serif", marginBottom: 10 }}>
              今年度（4月〜3月）事業別内訳
            </div>
            {yearlyBiz.map((item, i) => {
              const b = bizOf(item.bizId);
              const pct = Math.round((item.mins / totalYearly) * 100);
              const h = Math.floor(item.mins / 60);
              return (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontFamily: "'Noto Sans JP', sans-serif" }}>
                      {b?.icon} {b?.label}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: b?.color,
                      fontFamily: "'Noto Sans JP', sans-serif" }}>
                      {h}h（{pct}%）
                    </span>
                  </div>
                  <div style={{ height: 8, background: T.grayL, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: b?.color, borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop: 10, padding: "10px 12px", background: T.greenP,
              borderRadius: 10, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "'Noto Sans JP', sans-serif", fontSize: 13, fontWeight: 700, color: T.green }}>年間合計</span>
              <span style={{ fontFamily: "'Noto Sans JP', sans-serif", fontSize: 13, fontWeight: 800, color: T.green }}>
                {Math.floor(totalYearly / 60)}時間
              </span>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// ── JOURNAL ──
function JournalScreen({ posts, setPosts, markRead, currentUser, memberNames }) {
  const ME = currentUser?.name || "";
  const TAGS = ["報告", "連絡", "重要"];
  const TAG_COLORS = { "報告": T.green, "連絡": T.skyL, "重要": T.danger };

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ content: "", tag: "報告" });
  const [commentText, setCommentText] = useState({});
  const [loading, setLoading] = useState(false);

  // Supabaseから投稿を読み込む
  useEffect(() => {
    const loadPosts = async () => {
      const { data } = await supabase
        .from('journal_posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (data && data.length > 0) {
        const formatted = data.map(p => ({
          id: p.id,
          name: p.user_name,
          time: new Date(p.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          tag: p.tag,
          color: TAG_COLORS[p.tag] || T.green,
          content: p.content,
          likes: p.likes || 0,
          liked: false,
          comments: p.comments || [],
          showComments: false,
          readBy: p.read_by || [],
        }));
        setPosts(formatted);
      }
    };
    loadPosts();
  }, []);

  const submitPost = async () => {
    if (!draft.content.trim()) return;
    setLoading(true);
    const col = TAG_COLORS[draft.tag];
    const { data } = await supabase
      .from('journal_posts')
      .insert([{
        user_name: ME, tag: draft.tag, content: draft.content,
        likes: 0, read_by: [ME], comments: [],
      }])
      .select();
    if (data && data[0]) {
      setPosts(prev => [{
        id: data[0].id, name: ME, time: "たった今", tag: draft.tag, color: col,
        content: draft.content, likes: 0, liked: false, comments: [],
        showComments: false, readBy: [ME],
      }, ...prev]);
    }
    setDraft({ content: "", tag: "報告" });
    setShowForm(false);
    setLoading(false);
  };

  const toggleLike = async (id) => {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    const newLikes = post.liked ? post.likes - 1 : post.likes + 1;
    await supabase.from('journal_posts').update({ likes: newLikes }).eq('id', id);
    setPosts(prev => prev.map(p => p.id === id ? { ...p, liked: !p.liked, likes: newLikes } : p));
  };

  const toggleComments = async (id) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, showComments: !p.showComments } : p));
    const post = posts.find(p => p.id === id);
    if (post && !post.readBy.includes(ME)) {
      const newReadBy = [...post.readBy, ME];
      await supabase.from('journal_posts').update({ read_by: newReadBy }).eq('id', id);
      setPosts(prev => prev.map(p => p.id === id ? { ...p, readBy: newReadBy } : p));
    }
  };

  const addComment = async (id) => {
    const text = commentText[id]?.trim();
    if (!text) return;
    const post = posts.find(p => p.id === id);
    if (!post) return;
    const newComments = [...post.comments, `${ME}: ${text}`];
    await supabase.from('journal_posts').update({ comments: newComments }).eq('id', id);
    setPosts(prev => prev.map(p => p.id === id ? { ...p, comments: newComments } : p));
    setCommentText(prev => ({ ...prev, [id]: "" }));
  };

  return (
    <div style={{ padding: "16px 14px 100px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: T.green, fontFamily: "'Noto Sans JP', sans-serif" }}>
          📋 日誌・連絡事項
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          background: showForm ? T.gray : T.green, color: "white", border: "none",
          borderRadius: 20, padding: "7px 16px", fontSize: 12,
          cursor: "pointer", fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 700,
          zIndex: 10, position: "relative",
        }}>{showForm ? "✕ 閉じる" : "＋ 投稿する"}</button>
      </div>

      {/* 投稿フォーム */}
      {showForm && (
        <Card style={{ borderTop: `4px solid ${TAG_COLORS[draft.tag]}` }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: T.green,
            fontFamily: "'Noto Sans JP', sans-serif", marginBottom: 10 }}>📝 新しい投稿</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.gray,
              fontFamily: "'Noto Sans JP', sans-serif", marginBottom: 6 }}>種類</div>
            <div style={{ display: "flex", gap: 6 }}>
              {TAGS.map(t => (
                <button key={t} onClick={() => setDraft(d => ({ ...d, tag: t }))} style={{
                  background: draft.tag === t ? TAG_COLORS[t] : T.grayL,
                  color: draft.tag === t ? "white" : T.gray,
                  border: "none", borderRadius: 20, padding: "6px 14px",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Noto Sans JP', sans-serif",
                  position: "relative", zIndex: 10,
                }}>{t}</button>
              ))}
            </div>
            {draft.tag === "重要" && (
              <div style={{ marginTop: 8, padding: "6px 10px", background: `${T.danger}11`,
                borderRadius: 8, fontSize: 11, color: T.danger, fontFamily: "'Noto Sans JP', sans-serif" }}>
                🚨 全員が確認するまでホームに表示され続けます
              </div>
            )}
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.gray,
              fontFamily: "'Noto Sans JP', sans-serif", marginBottom: 6 }}>内容</div>
            <textarea value={draft.content}
              onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
              placeholder="例：今日の作業内容、連絡事項などを入力してください"
              style={{ width: "100%", minHeight: 90, borderRadius: 10,
                border: `1.5px solid ${T.grayL}`, padding: "10px 12px",
                fontSize: 13, fontFamily: "'Noto Sans JP', sans-serif",
                resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.6 }} />
          </div>
          <button onClick={submitPost} disabled={loading} style={{
            background: draft.content.trim() && !loading
              ? `linear-gradient(135deg,${TAG_COLORS[draft.tag]},${TAG_COLORS[draft.tag]}cc)` : T.grayL,
            color: draft.content.trim() && !loading ? "white" : T.gray,
            border: "none", borderRadius: 12, padding: "13px", width: "100%",
            fontWeight: 800, fontSize: 14,
            cursor: draft.content.trim() && !loading ? "pointer" : "default",
            fontFamily: "'Noto Sans JP', sans-serif",
          }}>
            {loading ? "投稿中..." : draft.content.trim() ? "✅ 投稿する" : "内容を入力してください"}
          </button>
        </Card>
      )}

      {/* 投稿一覧 */}
      {posts.map(p => {
        const allRead = p.tag === "重要" && p.readBy.length >= MEMBERS.length;
        return (
          <Card key={p.id} style={{ borderLeft: `4px solid ${p.color}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%",
                background: `${p.color}22`, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 15, fontWeight: 800, color: p.color,
                fontFamily: "'Noto Sans JP', sans-serif" }}>{p.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, fontFamily: "'Noto Sans JP', sans-serif" }}>{p.name}</div>
                <div style={{ fontSize: 10, color: T.gray, fontFamily: "'Noto Sans JP', sans-serif" }}>{p.time}</div>
              </div>
              <Tag label={p.tag} color={p.color} bg={`${p.color}18`} />
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.6, fontFamily: "'Noto Sans JP', sans-serif", color: "#374151" }}>
              {p.content}
            </div>

            {/* 重要：確認状況 */}
            {p.tag === "重要" && (
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {memberNames.map(m => (
                  <div key={m} style={{
                    background: p.readBy.includes(m) ? T.greenP : T.grayL,
                    borderRadius: 20, padding: "3px 10px", fontSize: 10,
                    color: p.readBy.includes(m) ? T.green : T.gray,
                    fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 700,
                  }}>
                    {p.readBy.includes(m) ? "✅" : "⬜"} {m.split(" ")[0]}
                  </div>
                ))}
                {allRead && (
                  <div style={{ fontSize: 10, color: T.green, fontFamily: "'Noto Sans JP', sans-serif",
                    fontWeight: 700, alignSelf: "center" }}>全員確認済み 🎉</div>
                )}
              </div>
            )}

            <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => toggleLike(p.id)} style={{
                background: p.liked ? `${T.green}18` : "none",
                border: `1px solid ${p.liked ? T.green : T.grayL}`,
                borderRadius: 20, padding: "5px 12px", fontSize: 12, cursor: "pointer",
                fontFamily: "'Noto Sans JP', sans-serif",
                color: p.liked ? T.green : T.gray, fontWeight: p.liked ? 700 : 400,
                zIndex: 10, position: "relative",
              }}>👍 {p.likes > 0 ? p.likes : ""}</button>

              <button onClick={() => toggleComments(p.id)} style={{
                background: p.showComments ? `${T.skyL}18` : "none",
                border: `1px solid ${p.showComments ? T.skyL : T.grayL}`,
                borderRadius: 20, padding: "5px 12px", fontSize: 12, cursor: "pointer",
                fontFamily: "'Noto Sans JP', sans-serif",
                color: p.showComments ? T.skyL : T.gray,
                zIndex: 10, position: "relative",
              }}>💬 {p.comments.length > 0 ? p.comments.length : ""}</button>

              <span style={{ fontSize: 11, color: T.gray, fontFamily: "'Noto Sans JP', sans-serif", marginLeft: "auto" }}>
                既読 {p.readBy.length}/{MEMBERS.length}
              </span>
            </div>

            {p.showComments && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.grayL}` }}>
                {p.comments.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, fontFamily: "'Noto Sans JP', sans-serif",
                    color: "#374151", padding: "4px 0", display: "flex", gap: 6 }}>
                    <span style={{ color: T.gray }}>💬</span> {c}
                  </div>
                ))}
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <input value={commentText[p.id] || ""}
                    onChange={e => setCommentText(prev => ({ ...prev, [p.id]: e.target.value }))}
                    placeholder="コメントを入力…"
                    style={{ flex: 1, borderRadius: 20, border: `1.5px solid ${T.grayL}`,
                      padding: "7px 12px", fontSize: 12,
                      fontFamily: "'Noto Sans JP', sans-serif", outline: "none" }} />
                  <button onClick={() => addComment(p.id)} style={{
                    background: T.green, color: "white", border: "none",
                    borderRadius: 20, padding: "7px 14px", fontSize: 12,
                    cursor: "pointer", fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 700,
                    zIndex: 10, position: "relative",
                  }}>送信</button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}


// ── LEAVE ──
function LeaveScreen({ currentUser }) {
  const [showForm, setShowForm] = useState(false);
  const [requests, setRequests] = useState([]);
  const [draft, setDraft] = useState({ date: "", days: "1" });
  const [loading, setLoading] = useState(false);

  // Supabaseから読み込む
  useEffect(() => {
    const loadRequests = async () => {
      const { data } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_name', currentUser?.name)
        .order('created_at', { ascending: false });
      if (data) {
        setRequests(data.map(r => ({
          date: r.date, days: r.days, status: r.status,
          color: r.status === '承認済' ? T.green : T.warn,
        })));
      }
    };
    if (currentUser?.name) loadRequests();
  }, [currentUser]);

  const usedDays = requests.filter(r => r.status === "承認済").reduce((a, r) => a + r.days, 0);
  const totalDays = 20;
  const remaining = totalDays - usedDays;

  const submitRequest = async () => {
    if (!draft.date) return;
    setLoading(true);
    const { data } = await supabase
      .from('leave_requests')
      .insert([{
        user_name: currentUser?.name,
        date: draft.date,
        days: Number(draft.days),
        status: '申請中',
      }])
      .select();
    if (data && data[0]) {
      setRequests(prev => [{
        date: draft.date, days: Number(draft.days),
        status: '申請中', color: T.warn,
      }, ...prev]);
    }
    setDraft({ date: "", days: "1" });
    setShowForm(false);
    setLoading(false);
  };

  return (
    <div style={{ padding: "16px 14px 100px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 18, color: T.green, fontFamily: "'Noto Sans JP', sans-serif" }}>📅 有給休暇</div>

      {/* 残日数カード */}
      <div style={{ background: `linear-gradient(135deg,${T.sky},${T.skyL})`,
        borderRadius: 20, padding: "20px", color: "white" }}>
        <div style={{ fontSize: 12, opacity: 0.85, fontFamily: "'Noto Sans JP', sans-serif" }}>2025年度 有給残日数</div>
        <div style={{ fontSize: 44, fontWeight: 800, margin: "8px 0", fontFamily: "'Noto Sans JP', sans-serif" }}>
          {remaining}<span style={{ fontSize: 18 }}>日</span>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {[["付与日数", `${totalDays}日`], ["使用済み", `${usedDays}日`], ["残り", `${remaining}日`]].map(([k,v],i) => (
            <div key={i}>
              <div style={{ fontSize: 10, opacity: 0.8, fontFamily: "'Noto Sans JP', sans-serif" }}>{k}</div>
              <div style={{ fontWeight: 700, fontFamily: "'Noto Sans JP', sans-serif" }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, height: 8, background: "rgba(255,255,255,0.2)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${(usedDays / totalDays) * 100}%`, height: "100%", background: "white", borderRadius: 4 }} />
        </div>
      </div>

      {/* 申請ボタン */}
      <button onClick={() => setShowForm(!showForm)} style={{
        background: showForm ? T.gray : `linear-gradient(135deg,${T.green},${T.greenL})`,
        color: "white", border: "none", borderRadius: 14, padding: "14px",
        fontSize: 15, fontWeight: 800, cursor: "pointer",
        fontFamily: "'Noto Sans JP', sans-serif",
        boxShadow: showForm ? "none" : `0 4px 16px ${T.green}44`,
        zIndex: 10, position: "relative",
      }}>
        {showForm ? "✕ 閉じる" : "＋ 有給休暇を申請する"}
      </button>

      {/* 申請フォーム（理由欄なし） */}
      {showForm && (
        <Card style={{ borderTop: `4px solid ${T.green}` }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: T.green,
            fontFamily: "'Noto Sans JP', sans-serif", marginBottom: 12 }}>📝 申請内容</div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.gray, marginBottom: 4,
              fontFamily: "'Noto Sans JP', sans-serif" }}>取得日</div>
            <input type="date" value={draft.date}
              onChange={e => setDraft(d => ({ ...d, date: e.target.value }))}
              style={{ width: "100%", borderRadius: 10, border: `1.5px solid ${T.grayL}`,
                padding: "9px 12px", fontSize: 13, fontFamily: "'Noto Sans JP', sans-serif",
                outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.gray, marginBottom: 4,
              fontFamily: "'Noto Sans JP', sans-serif" }}>日数</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["1","2","3","4","5"].map(n => (
                <button key={n} onClick={() => setDraft(d => ({ ...d, days: n }))} style={{
                  flex: 1, background: draft.days === n ? T.green : T.grayL,
                  color: draft.days === n ? "white" : T.gray,
                  border: "none", borderRadius: 10, padding: "9px 4px",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Noto Sans JP', sans-serif",
                  zIndex: 10, position: "relative",
                }}>{n}日</button>
              ))}
            </div>
          </div>

          <button onClick={submitRequest} disabled={loading} style={{
            background: draft.date && !loading ? `linear-gradient(135deg,${T.green},${T.greenL})` : T.grayL,
            color: draft.date && !loading ? "white" : T.gray,
            border: "none", borderRadius: 12, padding: "13px",
            width: "100%", fontWeight: 800, fontSize: 14,
            cursor: draft.date && !loading ? "pointer" : "default",
            fontFamily: "'Noto Sans JP', sans-serif",
          }}>
            {loading ? "申請中..." : draft.date ? `✅ ${draft.date}（${draft.days}日間）を申請する` : "日付を選んでください"}
          </button>
        </Card>
      )}

      {/* 申請履歴 */}
      <Card>
        <div style={{ fontWeight: 700, fontSize: 13, color: T.green,
          fontFamily: "'Noto Sans JP', sans-serif", marginBottom: 10 }}>📜 申請履歴</div>
        {requests.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10,
            padding: "8px 0", borderBottom: i < requests.length - 1 ? `1px solid ${T.grayL}` : "none" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, fontFamily: "'Noto Sans JP', sans-serif" }}>
                {r.date}（{r.days}日間）
              </div>
            </div>
            <Tag label={r.status} color={r.color} bg={`${r.color}18`} />
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── MEMBERS ──
const MEMBERS = [
  { name: "栗原 優介", icon: "👨‍🌾", color: T.green },
  { name: "栗原 直人", icon: "👨‍🌾", color: T.skyL },
  { name: "秋山 龍之介", icon: "👨‍🔧", color: T.amber },
];

// ── LOGIN SCREEN ──
function LoginScreen({ onLogin }) {
  return (
    <div style={{ width: "100%", minHeight: "100vh", maxWidth: "480px", margin: "0 auto",
      position: "relative", backgroundColor: "#f5f5f5",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "40px 20px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;800&display=swap" rel="stylesheet" />

        {/* ロゴ */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🌾</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.green,
            fontFamily: "'Noto Sans JP', sans-serif", lineHeight: 1.4 }}>
            関わるすべてに<br />喜びを
          </div>
          <div style={{ fontSize: 12, color: T.gray, fontFamily: "'Noto Sans JP', sans-serif", marginTop: 8,
            background: T.greenP, borderRadius: 20, padding: "4px 14px", display: "inline-block" }}>
            農業・食品事業 業務管理アプリ
          </div>
        </div>

        {/* 名前選択 */}
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.gray, textAlign: "center",
            fontFamily: "'Noto Sans JP', sans-serif", marginBottom: 16 }}>
            あなたはどちらですか？
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {MEMBERS.map(m => (
              <button key={m.name} onClick={() => onLogin(m)} style={{
                background: T.white,
                border: `2px solid ${T.greenP}`,
                borderRadius: 16, padding: "16px 20px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
                boxShadow: "0 2px 12px rgba(45,106,79,0.08)",
                width: "100%",
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: `${m.color}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 26, flexShrink: 0,
                }}>{m.icon}</div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#111",
                    fontFamily: "'Noto Sans JP', sans-serif" }}>{m.name}</div>
                </div>
                <div style={{ marginLeft: "auto", fontSize: 18, color: T.gray }}>›</div>
              </button>
            ))}
          </div>
        </div>
    </div>
  );
}

// ── INITIAL POSTS ──
const INITIAL_POSTS = [];

// ── APP ──
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [screen, setScreen] = useState("home");
  const [posts, setPosts] = useState(INITIAL_POSTS);

  // ログイン前はログイン画面を表示
  if (!currentUser) {
    return <LoginScreen onLogin={(member) => { setCurrentUser(member); setScreen("home"); }} />;
  }

  const ME = currentUser.name;
  const MEMBER_NAMES = MEMBERS.map(m => m.name);

  const markRead = (id) => {
    setPosts(prev => prev.map(p =>
      p.id === id && !p.readBy.includes(ME)
        ? { ...p, readBy: [...p.readBy, ME] }
        : p
    ));
  };

  const map = {
    home:    <HomeScreen posts={posts} markRead={markRead} onNav={setScreen} currentUser={currentUser} memberNames={MEMBER_NAMES} />,
    clock:   <ClockScreen />,
    work:    <WorkScreen currentUser={currentUser} />,
    journal: <JournalScreen posts={posts} setPosts={setPosts} markRead={markRead} currentUser={currentUser} memberNames={MEMBER_NAMES} />,
    leave:   <LeaveScreen currentUser={currentUser} />,
  };

  const unreadImportant = posts.filter(p => p.tag === "重要" && !p.readBy.includes(ME)).length;

  return (
    <div style={{ width: "100%", minHeight: "100vh", maxWidth: "480px", margin: "0 auto",
      position: "relative", backgroundColor: "#f5f5f5" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;800&display=swap" rel="stylesheet" />
      {/* ステータスバー */}
      <div style={{ background: T.white, padding: "10px 16px 8px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 20 }}>🌾</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.green,
            fontFamily: "'Noto Sans JP', sans-serif" }}>関わるすべてに喜びを</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>{currentUser.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.green,
            fontFamily: "'Noto Sans JP', sans-serif" }}>{currentUser.name.split(" ")[0]}</span>
          <button onClick={() => { setCurrentUser(null); setScreen("home"); }} style={{
            background: T.grayL, border: "none", borderRadius: 8,
            padding: "4px 8px", fontSize: 10, cursor: "pointer",
            color: T.gray, fontFamily: "'Noto Sans JP', sans-serif",
          }}>退出</button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={{ paddingBottom: "70px" }}>
        {map[screen]}
      </div>

      {/* ナビゲーションバー */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: "480px",
        backgroundColor: "#fff", borderTop: `1.5px solid ${T.greenP}`,
        display: "flex", justifyContent: "space-around",
        padding: "8px 0 20px", zIndex: 1000,
        boxShadow: "0 -2px 12px rgba(0,0,0,0.08)" }}>
        {[
          { id: "home",    icon: "🏠", label: "ホーム" },
          { id: "clock",   icon: "⏱",  label: "出退勤" },
          { id: "work",    icon: "🌾", label: "作業記録" },
          { id: "journal", icon: "📋", label: "日誌", badge: unreadImportant },
          { id: "leave",   icon: "📅", label: "有給" },
        ].map(it => (
          <button key={it.id} onClick={() => setScreen(it.id)} style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            background: "none", border: "none", cursor: "pointer", gap: 2,
            minWidth: 48, position: "relative",
          }}>
            <span style={{ fontSize: 22 }}>{it.icon}</span>
            {it.badge > 0 && (
              <div style={{ position: "absolute", top: -2, right: 4,
                background: T.danger, color: "white", borderRadius: "50%",
                width: 16, height: 16, fontSize: 9, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                {it.badge}
              </div>
            )}
            <span style={{ fontSize: 10, fontFamily: "'Noto Sans JP', sans-serif",
              fontWeight: screen === it.id ? 700 : 400,
              color: screen === it.id ? T.green : T.gray }}>
              {it.label}
            </span>
            {screen === it.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.green }} />}
          </button>
        ))}
      </div>
    </div>
  );
}