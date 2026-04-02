import React, { useState, useEffect } from 'react';
import { 
  Swords, 
  CalendarDays, 
  Plus, 
  X, 
  Minus, 
  Settings2, 
  AlertTriangle,
  Trophy,
  List
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// --- Types ---
type Tab = 'workout' | 'calendar';
type Exercise = { id: number; name: string };
type HistoryLog = Record<string, Record<number, number>>;
type ModalConfig = { show: boolean; type: string; data: any };

// --- 音效生成器 (Web Audio API) ---
const playHextechSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const playNote = (freq: number, startTime: number, duration: number, type: OscillatorType, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
      
      gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    // 升級/重生音效 (G4 -> C5 -> E5 -> G5)
    playNote(392.00, 0.0, 0.4, 'triangle', 0.3);
    playNote(523.25, 0.15, 0.4, 'triangle', 0.3);
    playNote(659.25, 0.3, 0.4, 'triangle', 0.3);
    playNote(783.99, 0.45, 1.2, 'sine', 0.4);
    
    // 科技感低音 (Hextech bass)
    playNote(130.81, 0.0, 0.6, 'square', 0.15); // C3
    playNote(65.41, 0.45, 1.2, 'sawtooth', 0.2); // C2
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

export default function App() {
  // --- 基礎狀態 ---
  const [currentTab, setCurrentTab] = useState<Tab>('workout');
  const [historyViewMode, setHistoryViewMode] = useState<'calendar' | 'list'>('calendar');
  const today = new Date();
  const [calendarDate, setCalendarDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const dateString = `${today.getFullYear()}年 ${today.getMonth() + 1}月 ${today.getDate()}日`;
  const fullDateKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

  // --- Firebase 資料同步 ---
  const [isLoading, setIsLoading] = useState(true);
  const [exerciseList, setExerciseList] = useState<Exercise[]>([]);
  const [historyLog, setHistoryLog] = useState<HistoryLog>({});

  // 監聽 Firebase 資料庫變化
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'fitness_app', 'shared_data'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let currentExercises = data.exercises || [];
        let currentHistory = data.historyLog || {};

        // --- 歷史資料自動匯入 ---
        if (!currentHistory['2025-12-28']) {
          const historicalData = {
            "2026-1-5": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":3,"8":1},
            "2026-1-6": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":3,"8":1},
            "2026-1-7": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":3,"8":1},
            "2026-1-10": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":1,"7":1,"8":1},
            "2026-2-10": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":3,"8":1},
            "2026-2-15": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":3,"8":1},
            "2026-2-25": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":3,"8":1},
            "2026-3-1": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":3,"8":1},
            "2026-3-27": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":3,"8":1},
            "2026-4-1": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":3,"8":1},
            "2026-4-2": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":3,"8":1},
            "2025-1-5": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3},
            "2025-1-11": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3},
            "2025-1-13": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":1},
            "2025-1-18": {"1":5,"2":5,"3":5,"4":5,"5":4,"6":3},
            "2025-1-21": {"1":5,"2":5,"3":5},
            "2025-1-25": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3},
            "2025-1-26": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3},
            "2025-1-28": {"1":5,"2":5,"3":1,"4":1,"5":5,"6":1,"8":5},
            "2025-2-19": {"1":5,"2":5,"3":5,"4":3,"5":1,"6":1,"8":1},
            "2025-2-25": {"1":4,"2":4,"3":4,"4":3,"5":3,"6":3,"8":1},
            "2025-3-5": {"1":5,"2":5,"3":5,"4":5,"5":5,"6":5,"8":1},
            "2025-3-11": {"1":3,"2":3,"3":2,"4":1,"5":1,"6":1,"8":1},
            "2025-4-20": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":3},
            "2025-4-24": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":1},
            "2025-4-25": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":1},
            "2025-5-12": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":1},
            "2025-5-13": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":1},
            "2025-5-17": {"1":3,"2":3,"3":3,"4":1,"5":1,"6":1,"8":1},
            "2025-5-26": {"1":3,"2":3,"3":2,"4":3,"5":3,"6":3,"8":1},
            "2025-6-1": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":1},
            "2025-6-16": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":1},
            "2025-6-17": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":1},
            "2025-6-18": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":1},
            "2025-6-27": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":1},
            "2025-6-28": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":3},
            "2025-7-21": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":1},
            "2025-7-22": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":1},
            "2025-7-30": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":1},
            "2025-8-1": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":1},
            "2025-8-10": {"1":3,"2":1,"3":1,"4":1,"5":1,"6":1,"8":1},
            "2025-9-1": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":1},
            "2025-9-26": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":1},
            "2025-9-28": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":1},
            "2025-10-1": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":1},
            "2025-10-3": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":3},
            "2025-10-13": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"8":1},
            "2025-10-18": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":3,"8":1},
            "2025-10-22": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":3,"8":1},
            "2025-11-1": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":1,"8":1},
            "2025-11-6": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":1,"8":1},
            "2025-11-9": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":1,"7":1,"8":1},
            "2025-12-15": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":1,"7":1,"8":1},
            "2025-12-16": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":1,"8":1},
            "2025-12-18": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":1,"8":1},
            "2025-12-19": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":3,"8":1},
            "2025-12-22": {"9":5},
            "2025-12-23": {"9":6},
            "2025-12-24": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":3,"8":1},
            "2025-12-27": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":3,"7":3,"8":1},
            "2025-12-28": {"1":3,"2":3,"3":3,"4":3,"5":3,"6":4,"7":3,"8":1}
          };
          
          currentHistory = { ...currentHistory, ...historicalData };
          
          // 更新專精列表以符合歷史紀錄
          const fullExercises = [
            { id: 1, name: "二頭" },
            { id: 2, name: "三頭" },
            { id: 3, name: "垂式二頭" },
            { id: 4, name: "肩膀" },
            { id: 5, name: "雙二頭" },
            { id: 6, name: "往上肩膀" },
            { id: 7, name: "飛鳥" },
            { id: 8, name: "單槓" },
            { id: 9, name: "伏地挺身" }
          ];
          
          // 合併現有與新的專精（避免覆蓋使用者後來新增的）
          const existingIds = new Set(currentExercises.map(e => e.id));
          fullExercises.forEach(ex => {
            if (!existingIds.has(ex.id)) {
              currentExercises.push(ex);
            } else {
              // 更新名稱以符合歷史紀錄的簡稱
              const index = currentExercises.findIndex(e => e.id === ex.id);
              if (index !== -1) currentExercises[index].name = ex.name;
            }
          });

          setDoc(doc(db, 'fitness_app', 'shared_data'), {
            historyLog: currentHistory,
            exercises: currentExercises
          }, { merge: true });
        }

        setExerciseList(currentExercises);
        setHistoryLog(currentHistory);
        setIsLoading(false);
      } else {
        // 如果資料庫是空的，初始化預設資料
        const defaultExercises = [
          { id: 1, name: "二頭彎舉" },
          { id: 2, name: "三頭下壓" },
          { id: 3, name: "肩推" },
          { id: 4, name: "飛鳥" },
          { id: 5, name: "單槓" }
        ];
        setDoc(doc(db, 'fitness_app', 'shared_data'), {
          exercises: defaultExercises,
          historyLog: {}
        });
      }
    }, (error) => {
      console.error("Firebase 連線錯誤:", error);
      // 如果出錯（例如權限不足或沒開 Firestore），至少解除載入狀態
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  const [isEditMode, setIsEditMode] = useState(false);
  const todayLog = historyLog[fullDateKey] || {};

  const updateTodayLog = async (exerciseId: number, delta: number) => {
    const currentLog = historyLog[fullDateKey] || {};
    const currentCount = currentLog[exerciseId] || 0;
    const newCount = currentCount + delta;
    
    const newLog = { ...currentLog };
    if (newCount <= 0) {
      delete newLog[exerciseId];
    } else {
      newLog[exerciseId] = newCount;
    }
    
    // 寫入 Firebase
    await setDoc(doc(db, 'fitness_app', 'shared_data'), {
      historyLog: {
        ...historyLog,
        [fullDateKey]: newLog
      }
    }, { merge: true });
  };

  // --- 計時器狀態 ---
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerTotal, setTimerTotal] = useState(1);
  const [isActive, setIsActive] = useState(false);
  const [showRespawnToast, setShowRespawnToast] = useState(false);
  
  // UI 彈出視窗狀態
  const [modalConfig, setModalConfig] = useState<ModalConfig>({ show: false, type: '', data: null });
  
  // 自訂時間狀態
  const [pickH, setPickH] = useState(0);
  const [pickM, setPickM] = useState(1);
  const [pickS, setPickS] = useState(30);

  // 輸入框狀態
  const [inputText, setInputText] = useState("");

  // --- 計時器邏輯 ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      if (navigator.vibrate) navigator.vibrate([300, 100, 300]); 
      
      // 播放英雄聯盟風格音效
      playHextechSound();
      
      // 替換原本的 alert 為自訂 Toast
      setShowRespawnToast(true);
      setTimeout(() => setShowRespawnToast(false), 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const startTimer = (seconds: number) => {
    setTimeLeft(seconds);
    setTimerTotal(seconds);
    setIsActive(true);
    setShowRespawnToast(false);
  };

  const confirmCustomTimer = () => {
    const totalSecs = (pickH * 3600) + (pickM * 60) + pickS;
    if(totalSecs > 0) {
      startTimer(totalSecs);
      closeModal();
    }
  };

  // --- Modal 控制 ---
  const openCustomTimer = () => setModalConfig({ show: true, type: 'timer', data: null });
  
  const openAddExercise = () => {
    setInputText("");
    setModalConfig({ show: true, type: 'add_exercise', data: null });
  };
  
  const openEditExercise = (exercise: Exercise) => {
    setInputText(exercise.name);
    setModalConfig({ show: true, type: 'edit_exercise', data: exercise });
  };

  const openDayDetail = (dateKey: string) => {
    if (historyLog[dateKey] && Object.keys(historyLog[dateKey]).length > 0) {
      setModalConfig({ show: true, type: 'day_detail', data: { dateKey, log: historyLog[dateKey] } });
    }
  };

  const closeModal = () => setModalConfig({ show: false, type: '', data: null });

  // --- 動作處理邏輯 ---
  const handleExerciseClick = (exercise: Exercise) => {
    if (isEditMode) {
      openEditExercise(exercise);
    } else {
      updateTodayLog(exercise.id, 1);
    }
  };

  const saveExercise = async () => {
    if (inputText.trim() === "") return;
    
    let newList = [...exerciseList];
    if (modalConfig.type === 'add_exercise') {
      newList.push({ id: Date.now(), name: inputText });
    } else if (modalConfig.type === 'edit_exercise') {
      newList = exerciseList.map(e => 
        e.id === modalConfig.data.id ? { ...e, name: inputText } : e
      );
    }
    
    // 寫入 Firebase
    await setDoc(doc(db, 'fitness_app', 'shared_data'), {
      exercises: newList
    }, { merge: true });
    
    closeModal();
  };

  const deleteExercise = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setModalConfig({ show: true, type: 'delete_confirm', data: id });
  };

  const confirmDelete = async () => {
    const newList = exerciseList.filter(ex => ex.id !== modalConfig.data);
    
    // 寫入 Firebase
    await setDoc(doc(db, 'fitness_app', 'shared_data'), {
      exercises: newList
    }, { merge: true });
    
    closeModal();
  };

  // --- 日曆產生邏輯 ---
  const getDaysInMonth = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); 
    let grid = [];
    for(let i=0; i<firstDay; i++) grid.push(null);
    for(let i=1; i<=days; i++) grid.push(i);
    return grid;
  };

  const prevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-[#010a13] flex flex-col items-center justify-center text-[#c8aa6e]">
        <div className="w-16 h-16 border-4 border-[#c8aa6e] border-t-[#0ac8b9] rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(10,200,185,0.5)]"></div>
        <p className="font-serif tracking-widest animate-pulse text-lg hextech-gold-glow">連線至海克斯核心...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto relative h-full flex flex-col bg-[#010a13] text-[#f0e6d2] font-sans">
      
      {/* --- 頂部計時器 (海克斯科技面板) --- */}
      <div className="flex-none bg-[#091428] pt-4 pb-3 px-4 border-b-2 border-[#c8aa6e] z-30 shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-center mb-3">
          <div className={`text-4xl font-serif font-black tracking-widest w-28 transition-colors duration-300
            ${timeLeft > 0 && timeLeft <= 10 ? 'text-[#e43737] drop-shadow-[0_0_8px_rgba(228,55,55,0.8)]' : 'text-[#0ac8b9] hextech-glow'}`}>
            {formatTime(timeLeft)}
          </div>
          <div className="flex gap-2">
            <button onClick={() => startTimer(30)} className="bg-[#1e2328] border border-[#c8aa6e]/50 hover:bg-[#c8aa6e] hover:text-[#010a13] text-[#c8aa6e] px-3 py-1.5 text-sm font-bold btn-press transition-colors">30s</button>
            <button onClick={() => startTimer(60)} className="bg-[#1e2328] border border-[#c8aa6e]/50 hover:bg-[#c8aa6e] hover:text-[#010a13] text-[#c8aa6e] px-3 py-1.5 text-sm font-bold btn-press transition-colors">60s</button>
            <button onClick={openCustomTimer} className="bg-[#1e2328] border border-[#0ac8b9]/50 hover:bg-[#0ac8b9] hover:text-[#010a13] text-[#0ac8b9] px-3 py-1.5 text-sm font-bold btn-press transition-colors">自訂</button>
            {isActive && (
              <button onClick={() => setIsActive(false)} className="bg-[#e43737]/20 text-[#e43737] px-3 py-1.5 text-sm font-bold border border-[#e43737] btn-press">停止</button>
            )}
          </div>
        </div>
        {/* 進度條 */}
        <div className="w-full h-1.5 bg-[#010a13] border border-[#1e2328] overflow-hidden relative mt-2">
          <div 
            className={`absolute left-0 top-0 h-full transition-all duration-1000 ease-linear shadow-[0_0_10px_currentColor]
              ${timeLeft <= 10 ? 'bg-[#e43737]' : 'bg-[#0ac8b9]'}`}
            style={{ width: `${isActive ? (timeLeft / timerTotal) * 100 : 0}%` }}
          ></div>
        </div>
      </div>

      {/* --- 提示 Toast (取代 alert) --- */}
      {showRespawnToast && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 w-[90%] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-[#091428] border-2 border-[#c8aa6e] p-4 shadow-[0_0_20px_rgba(200,170,110,0.4)] flex items-center justify-center gap-3">
            <Trophy className="text-[#c8aa6e] w-6 h-6" />
            <span className="font-serif font-bold text-[#c8aa6e] text-lg tracking-wider">重生完畢，準備出擊！</span>
          </div>
        </div>
      )}

      {/* --- 主內容滾動區 --- */}
      <div className="flex-1 overflow-y-auto pb-24 px-4 pt-5">
        
        {/* ================= 分頁 1: 訓練主頁 ================= */}
        {currentTab === 'workout' && (
          <div className="animate-in fade-in duration-300 space-y-6">
            
            {/* 今日戰報 */}
            <div className="bg-[#091428]/80 border border-[#322814] p-5 shadow-lg relative overflow-hidden">
              {/* 裝飾角落 */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#c8aa6e]"></div>
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#c8aa6e]"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#c8aa6e]"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#c8aa6e]"></div>

              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-serif font-bold text-[#f0e6d2] flex items-center gap-2">
                  <Swords className="w-5 h-5 text-[#c8aa6e]" />
                  今日戰績
                </h2>
                <span className="text-xs font-bold text-[#0ac8b9] bg-[#0ac8b9]/10 px-2 py-1 border border-[#0ac8b9]/30">{dateString}</span>
              </div>
              
              {Object.keys(todayLog).length === 0 ? (
                <div className="text-center py-8 text-[#a09b8c] text-sm border border-dashed border-[#322814] bg-[#010a13]/50">
                  尚未進入召喚峽谷 (無訓練紀錄)
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(todayLog).map(([idStr, count]) => {
                    const ex = exerciseList.find(e => e.id === parseInt(idStr));
                    if(!ex) return null;
                    return (
                      <div key={idStr} className="flex justify-between items-center bg-[#010a13] p-3 border border-[#1e2328] hover:border-[#c8aa6e]/50 transition-colors">
                        <span className="font-medium text-[#f0e6d2]">{ex.name}</span>
                        <div className="flex items-center gap-3">
                          <button onClick={() => updateTodayLog(ex.id, -1)} className="w-8 h-8 bg-[#1e2328] text-[#a09b8c] flex items-center justify-center btn-press hover:bg-[#e43737]/20 hover:text-[#e43737] border border-transparent hover:border-[#e43737]/50 transition-all">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-xl font-serif font-bold text-[#c8aa6e] w-8 text-center hextech-gold-glow">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 動作面板 */}
            <div>
              <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="text-xs font-bold text-[#a09b8c] uppercase tracking-widest">選擇訓練專精</h3>
                <button onClick={() => setIsEditMode(!isEditMode)} className={`text-xs px-3 py-1.5 font-medium transition-colors border flex items-center gap-1
                  ${isEditMode ? 'bg-[#c8aa6e]/20 text-[#c8aa6e] border-[#c8aa6e]' : 'text-[#a09b8c] bg-[#091428] border-[#1e2328] hover:text-[#f0e6d2]'}`}>
                  <Settings2 className="w-3 h-3" />
                  {isEditMode ? '完成修改' : '修改專精'}
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {exerciseList.map(ex => (
                  <div key={ex.id} className="relative">
                    <button 
                      onClick={() => handleExerciseClick(ex)}
                      className={`w-full py-5 px-2 text-center font-bold text-[15px] transition-all btn-press border
                        ${isEditMode 
                          ? 'bg-[#010a13] text-[#a09b8c] border-[#322814] border-dashed' 
                          : 'bg-[#091428] border-[#322814] text-[#f0e6d2] hover:border-[#c8aa6e] hover:text-[#c8aa6e] shadow-[0_4px_6px_rgba(0,0,0,0.3)]'
                        }
                      `}
                    >
                      {ex.name}
                    </button>
                    {isEditMode && (
                      <button onClick={(e) => deleteExercise(e, ex.id)} className="absolute -top-2 -right-2 bg-[#e43737] w-6 h-6 text-white flex items-center justify-center shadow-lg btn-press border border-[#ff6b6b]">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                
                <button onClick={openAddExercise} className="w-full py-5 px-2 bg-transparent border border-dashed border-[#322814] text-[#a09b8c] font-bold hover:bg-[#091428] hover:text-[#c8aa6e] hover:border-[#c8aa6e]/50 flex justify-center items-center gap-2 btn-press transition-colors">
                  <Plus className="w-4 h-4" /> 新增專精
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= 分頁 2: 歷史日期 ================= */}
        {currentTab === 'calendar' && (
          <div className="animate-in fade-in duration-300 bg-[#091428]/80 border border-[#322814] p-5 relative">
            {/* 裝飾角落 */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#c8aa6e]"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#c8aa6e]"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#c8aa6e]"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#c8aa6e]"></div>

            <div className="text-center mb-6 relative">
              <h2 className="text-xl font-serif font-bold text-[#c8aa6e] tracking-widest">
                {historyViewMode === 'calendar' ? '賽季紀錄' : '詳細記錄'}
              </h2>
              
              {historyViewMode === 'calendar' && (
                <div className="flex items-center justify-center gap-4 mt-2">
                  <button onClick={prevMonth} className="text-[#c8aa6e] hover:text-[#f0e6d2] p-1 text-lg font-bold">&lt;</button>
                  <p className="text-sm text-[#a09b8c] w-24">{calendarDate.getFullYear()}年 {calendarDate.getMonth() + 1}月</p>
                  <button onClick={nextMonth} className="text-[#c8aa6e] hover:text-[#f0e6d2] p-1 text-lg font-bold">&gt;</button>
                </div>
              )}
              
              {/* 視圖切換按鈕 */}
              <div className="absolute top-0 right-0 flex bg-[#010a13] border border-[#322814] p-0.5">
                <button 
                  onClick={() => setHistoryViewMode('calendar')}
                  className={`p-1.5 transition-colors ${historyViewMode === 'calendar' ? 'bg-[#1e2328] text-[#c8aa6e]' : 'text-[#a09b8c] hover:text-[#f0e6d2]'}`}
                >
                  <CalendarDays className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setHistoryViewMode('list')}
                  className={`p-1.5 transition-colors ${historyViewMode === 'list' ? 'bg-[#1e2328] text-[#c8aa6e]' : 'text-[#a09b8c] hover:text-[#f0e6d2]'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {historyViewMode === 'calendar' ? (
              <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center">
                {['日','一','二','三','四','五','六'].map(d => <div key={d} className="text-[10px] text-[#a09b8c] font-bold">{d}</div>)}
                
                {getDaysInMonth().map((day, idx) => {
                  if(!day) return <div key={`empty-${idx}`}></div>;
                  const dateKey = `${calendarDate.getFullYear()}-${calendarDate.getMonth()+1}-${day}`;
                  const dayLog = historyLog[dateKey];
                  const isTrained = dayLog && Object.keys(dayLog).length > 0;
                  const isToday = day === today.getDate() && calendarDate.getMonth() === today.getMonth() && calendarDate.getFullYear() === today.getFullYear();

                  return (
                    <div key={day} className="flex flex-col items-center justify-center gap-1">
                      <button 
                        onClick={() => openDayDetail(dateKey)}
                        disabled={!isTrained}
                        className={`w-9 h-9 flex items-center justify-center text-sm font-bold transition-all border
                          ${isTrained ? 'bg-[#0ac8b9]/10 text-[#0ac8b9] border-[#0ac8b9]/50 btn-press cursor-pointer shadow-[0_0_8px_rgba(10,200,185,0.2)]' : 'text-[#5a5a5a] border-transparent cursor-default'}
                          ${isToday && !isTrained ? 'bg-[#1e2328] border-[#322814] text-[#a09b8c]' : ''}
                        `}
                      >
                        {day}
                      </button>
                      {isTrained && <div className="w-1 h-1 bg-[#0ac8b9] shadow-[0_0_4px_#0ac8b9]"></div>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-6 text-left mt-4 max-h-[60vh] overflow-y-auto pr-2">
                {Object.keys(historyLog).filter(k => Object.keys(historyLog[k]).length > 0).length === 0 ? (
                  <div className="text-center py-8 text-[#a09b8c] text-sm border border-dashed border-[#322814] bg-[#010a13]/50">
                    尚無戰績紀錄
                  </div>
                ) : (
                  (() => {
                    const sortedKeys = Object.keys(historyLog)
                      .filter(dateKey => Object.keys(historyLog[dateKey]).length > 0)
                      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                    
                    let currentYearMonth = '';
                    
                    return sortedKeys.map(dateKey => {
                      const log = historyLog[dateKey];
                      const [year, month, day] = dateKey.split('-');
                      const yearMonth = `${year}年${month}月`;
                      const showHeader = yearMonth !== currentYearMonth;
                      if (showHeader) currentYearMonth = yearMonth;

                      return (
                        <React.Fragment key={dateKey}>
                          {showHeader && (
                            <div className="flex items-center gap-2 my-6 first:mt-0">
                              <div className="h-px bg-[#322814] flex-1"></div>
                              <span className="text-[#a09b8c] font-bold text-sm tracking-widest">{yearMonth}</span>
                              <div className="h-px bg-[#322814] flex-1"></div>
                            </div>
                          )}
                          <div className="mb-4">
                            <h3 className="text-[#c8aa6e] font-serif font-bold text-lg mb-2">{month}/{day}</h3>
                            <div className="space-y-1.5 pl-2">
                              {Object.entries(log).map(([idStr, count], index) => {
                                const ex = exerciseList.find(e => e.id === parseInt(idStr));
                                const exName = ex ? ex.name : `已遺忘專精 (ID:${idStr})`;
                                return (
                                  <div key={idStr} className="text-[#f0e6d2] text-[15px] tracking-wide flex items-center">
                                    <span className="w-5 text-right mr-2 text-[#a09b8c]">{index + 1}.</span>
                                    <span>{exName} : <span className="text-[#0ac8b9] ml-1">{count as number}</span> 組</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    });
                  })()
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- 底部導航列 --- */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#010a13] border-t-2 border-[#322814] flex justify-around items-center pb-6 pt-3 px-4 z-30 shadow-[0_-4px_15px_rgba(0,0,0,0.5)]">
        <button onClick={() => setCurrentTab('workout')} className={`flex flex-col items-center p-2 w-24 transition-all ${currentTab === 'workout' ? 'text-[#c8aa6e]' : 'text-[#a09b8c] hover:text-[#f0e6d2]'}`}>
          <Swords className={`w-6 h-6 mb-1.5 ${currentTab === 'workout' ? 'drop-shadow-[0_0_5px_rgba(200,170,110,0.5)]' : ''}`} />
          <span className="text-[10px] font-bold tracking-widest">特訓</span>
        </button>
        <button onClick={() => setCurrentTab('calendar')} className={`flex flex-col items-center p-2 w-24 transition-all ${currentTab === 'calendar' ? 'text-[#c8aa6e]' : 'text-[#a09b8c] hover:text-[#f0e6d2]'}`}>
          <CalendarDays className={`w-6 h-6 mb-1.5 ${currentTab === 'calendar' ? 'drop-shadow-[0_0_5px_rgba(200,170,110,0.5)]' : ''}`} />
          <span className="text-[10px] font-bold tracking-widest">戰績</span>
        </button>
      </div>

      {/* ================= 全域 Modal ================= */}
      {modalConfig.show && (
        <div className="fixed inset-0 bg-[#010a13]/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          
          {/* 1. 自訂時間 Modal */}
          {modalConfig.type === 'timer' && (
            <div className="bg-[#091428] w-full max-w-sm p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col items-center border border-[#c8aa6e] relative">
              {/* 裝飾 */}
              <div className="absolute -top-1 -left-1 w-3 h-3 bg-[#c8aa6e]"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#c8aa6e]"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-[#c8aa6e]"></div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#c8aa6e]"></div>

              <h3 className="text-lg font-serif font-bold mb-6 text-[#c8aa6e] tracking-widest">設定倒數時間</h3>
              <div className="flex items-center gap-2 text-xl font-bold mb-8 w-full justify-center">
                <div className="flex flex-col items-center">
                  <select value={pickH} onChange={(e) => setPickH(Number(e.target.value))} className="bg-[#010a13] text-[#f0e6d2] text-center w-16 py-3 border border-[#322814] focus:border-[#0ac8b9] outline-none">
                    {[...Array(24).keys()].map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span className="text-xs text-[#a09b8c] mt-2 font-normal">時</span>
                </div>
                <span className="text-[#322814] pb-6">:</span>
                <div className="flex flex-col items-center">
                  <select value={pickM} onChange={(e) => setPickM(Number(e.target.value))} className="bg-[#010a13] text-[#f0e6d2] text-center w-16 py-3 border border-[#322814] focus:border-[#0ac8b9] outline-none">
                    {[...Array(60).keys()].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <span className="text-xs text-[#a09b8c] mt-2 font-normal">分</span>
                </div>
                <span className="text-[#322814] pb-6">:</span>
                <div className="flex flex-col items-center">
                  <select value={pickS} onChange={(e) => setPickS(Number(e.target.value))} className="bg-[#010a13] text-[#f0e6d2] text-center w-16 py-3 border border-[#322814] focus:border-[#0ac8b9] outline-none">
                    {[...Array(60).keys()].map(s => <option key={s} value={s}>{s.toString().padStart(2, '0')}</option>)}
                  </select>
                  <span className="text-xs text-[#a09b8c] mt-2 font-normal">秒</span>
                </div>
              </div>
              <div className="flex gap-3 w-full">
                <button onClick={closeModal} className="flex-1 py-3 bg-[#1e2328] text-[#a09b8c] font-bold btn-press border border-[#322814]">取消</button>
                <button onClick={confirmCustomTimer} className="flex-1 py-3 bg-[#0ac8b9]/20 text-[#0ac8b9] font-extrabold btn-press border border-[#0ac8b9]">開始</button>
              </div>
            </div>
          )}

          {/* 2. 新增/修改動作 Modal */}
          {(modalConfig.type === 'add_exercise' || modalConfig.type === 'edit_exercise') && (
            <div className="bg-[#091428] w-full max-w-sm p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col items-center border border-[#c8aa6e] relative">
              <div className="absolute -top-1 -left-1 w-3 h-3 bg-[#c8aa6e]"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#c8aa6e]"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-[#c8aa6e]"></div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#c8aa6e]"></div>

              <h3 className="text-lg font-serif font-bold mb-4 text-[#c8aa6e] tracking-widest">
                {modalConfig.type === 'add_exercise' ? '新增訓練專精' : '重新命名專精'}
              </h3>
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="輸入專精名稱 (例如: 深蹲)"
                className="w-full bg-[#010a13] text-[#f0e6d2] px-4 py-3 border border-[#322814] focus:outline-none focus:border-[#c8aa6e] mb-6 text-center text-lg"
                autoFocus
              />
              <div className="flex gap-3 w-full">
                <button onClick={closeModal} className="flex-1 py-3 bg-[#1e2328] text-[#a09b8c] font-bold btn-press border border-[#322814]">取消</button>
                <button onClick={saveExercise} className="flex-1 py-3 bg-[#c8aa6e]/20 text-[#c8aa6e] font-extrabold btn-press border border-[#c8aa6e]">確認鑄造</button>
              </div>
            </div>
          )}

          {/* 3. 刪除確認 Modal */}
          {modalConfig.type === 'delete_confirm' && (
            <div className="bg-[#091428] w-full max-w-sm p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col items-center border border-[#e43737] relative">
              <div className="w-12 h-12 bg-[#e43737]/20 text-[#e43737] flex items-center justify-center mb-4 border border-[#e43737]">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif font-bold mb-2 text-[#e43737] tracking-widest">確定遺忘此專精？</h3>
              <p className="text-[#a09b8c] text-sm mb-6 text-center">刪除後將無法從面板點選此項目，但過往的戰績紀錄不受影響。</p>
              <div className="flex gap-3 w-full">
                <button onClick={closeModal} className="flex-1 py-3 bg-[#1e2328] text-[#a09b8c] font-bold btn-press border border-[#322814]">取消</button>
                <button onClick={confirmDelete} className="flex-1 py-3 bg-[#e43737]/20 text-[#e43737] font-extrabold btn-press border border-[#e43737]">確定遺忘</button>
              </div>
            </div>
          )}

          {/* 4. 查看單日歷史紀錄 Modal */}
          {modalConfig.type === 'day_detail' && (
            <div className="bg-[#091428] w-full max-w-sm p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col border border-[#c8aa6e] max-h-[80vh] relative">
              <div className="absolute -top-1 -left-1 w-3 h-3 bg-[#c8aa6e]"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#c8aa6e]"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-[#c8aa6e]"></div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#c8aa6e]"></div>

              <div className="flex justify-between items-center mb-6 border-b border-[#322814] pb-3">
                <h3 className="text-xl font-serif font-bold text-[#0ac8b9] flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  {modalConfig.data.dateKey.split('-')[1]}月{modalConfig.data.dateKey.split('-')[2]}日 戰績
                </h3>
                <button onClick={closeModal} className="w-8 h-8 bg-[#1e2328] text-[#a09b8c] flex items-center justify-center hover:text-[#f0e6d2] border border-[#322814]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="overflow-y-auto pr-2 space-y-3 flex-1">
                {Object.entries(modalConfig.data.log).map(([idStr, count]) => {
                  const ex = exerciseList.find(e => e.id === parseInt(idStr));
                  const exName = ex ? ex.name : `已遺忘專精 (ID:${idStr})`;
                  return (
                    <div key={idStr} className="flex justify-between items-center bg-[#010a13] p-3 border border-[#1e2328]">
                      <span className="font-medium text-[#f0e6d2]">{exName}</span>
                      <span className="text-lg font-serif font-bold text-[#c8aa6e]">{count as number} 組</span>
                    </div>
                  );
                })}
              </div>
              
              <button onClick={closeModal} className="w-full py-3 mt-6 bg-[#1e2328] text-[#c8aa6e] font-bold btn-press border border-[#c8aa6e]/50 hover:bg-[#c8aa6e]/10">關閉</button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
