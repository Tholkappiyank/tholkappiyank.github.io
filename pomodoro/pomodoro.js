document.addEventListener("DOMContentLoaded", () => {
  let o = {
      isSettingsOpen: !1,
      settings: {
        workTime: 25,
        shortBreakTime: 5,
        longBreakTime: 15,
        sessionCount: 4,
        soundEnabled: !0,
        autoStartBreaks: !1,
        autoStartWork: !1,
        autoCheckTask: !1,
        showNotifications: !0,
        soundType: "default",
        soundVolume: 80
      },
      pomodoro: {
        type: "work",
        timeRemaining: 1500,
        initialTime: 1500,
        isRunning: !1,
        isPaused: !1,
        intervalId: null,
        completedPomodoros: 0,
        totalPomodoros: 0,
        flipLast: {
          minutes: "",
          seconds: ""
        },
        audioContext: null,
        activeTaskId: null
      },
      tasks: [],
      stats: {
        todayCompleted: 0,
        todayMinutes: 0,
        totalCompleted: 0,
        lastDate: null
      },
      notification: {
        hasRequestedPermission: !1
      },
      soundBuffers: {},
      isPlayingTestSound: !1
    },
    e = "flipSuitePomodoroSettings_v3",
    t = "flipSuitePomodoroTasks_v1",
    s = "flipSuitePomodoroStats_v1",
    n = {
      work: "var(--pomodoro-color)",
      shortBreak: "var(--short-break-color)",
      longBreak: "var(--long-break-color)"
    },
    i = {
      default: window.pomodoroTranslations?.soundPathDefault || "sounds/alarm.mp3",
      chime: window.pomodoroTranslations?.soundPathChime || "sounds/pomodoro-chime.mp3",
      digital: window.pomodoroTranslations?.soundPathDigital || "sounds/pomodoro-digital.mp3",
      melody: window.pomodoroTranslations?.soundPathMelody || "sounds/pomodoro-melody.mp3"
    };

  function r(o) {
    return document.querySelector(o)
  }

  function a(o) {
    return Array.from(document.querySelectorAll(o))
  }

  function d(o, e) {
    o && o.textContent !== e && (o.textContent = e)
  }

  function l(o, e) {
    document.documentElement.style.setProperty(o, e)
  }
  let m = {
    settingsPanel: r("#settings-panel"),
    closeSettingsButton: r("#close-settings"),
    pomodoro: {
      sessionTypeDisplay: r("#session-type-display"),
      sessionTypeSelectors: a(".session-selector-btn"),
      minutesTopText: r("#minutes-top-text"),
      minutesBottomText: r("#minutes-bottom-text"),
      minutesFlipTop: r("#minutes-flip-top"),
      minutesFlipBottom: r("#minutes-flip-bottom"),
      minutesFlipTopText: r("#minutes-flip-top-text"),
      minutesFlipBottomText: r("#minutes-flip-bottom-text"),
      minutesSr: r("#minutes-sr"),
      secondsTopText: r("#seconds-top-text"),
      secondsBottomText: r("#seconds-bottom-text"),
      secondsFlipTop: r("#seconds-flip-top"),
      secondsFlipBottom: r("#seconds-flip-bottom"),
      secondsFlipTopText: r("#seconds-flip-top-text"),
      secondsFlipBottomText: r("#seconds-flip-bottom-text"),
      secondsSr: r("#seconds-sr"),
      sessionCount: r("#pomodoro-session-count"),
      startPauseButton: r("#pomodoro-start-pause-btn"),
      resetButton: r("#pomodoro-reset-btn"),
      skipButton: r("#pomodoro-skip-btn"),
      workTimeInput: r("#pomodoro-work-time"),
      shortBreakInput: r("#pomodoro-short-break"),
      longBreakInput: r("#pomodoro-long-break"),
      sessionsInput: r("#pomodoro-sessions"),
      soundToggle: r("#pomodoro-sound-toggle"),
      autoBreaksToggle: r("#pomodoro-auto-breaks-toggle"),
      autoWorkToggle: r("#pomodoro-auto-work-toggle"),
      autoCheckToggle: r("#pomodoro-auto-check-toggle"),
      notificationToggle: r("#pomodoro-notification-toggle"),
      sessionProgressBar: r("#session-progress-bar"),
      sessionStats: r("#session-stats"),
      presetButtons: a(".time-preset-btn"),
      soundSelector: r("#sound-selector"),
      volumeSlider: r("#volume-slider"),
      volumeValue: r("#volume-value"),
      testSoundBtn: r("#test-sound-btn"),
      audio: r("#pomodoro-audio")
    },
    tasks: {
      input: r("#task-input"),
      addButton: r("#add-task-btn"),
      list: r("#tasks-list"),
      noTasksMessage: r("#no-tasks-message"),
      clearCompletedBtn: r("#clear-completed-btn")
    }
  };

  function p() {
    try {
      let t = {
        ...o.settings
      };
      localStorage.setItem(e, JSON.stringify(t))
    } catch (s) {
      console.warn("Save Pomodoro settings failed:", s)
    }
  }

  function u() {
    let t = {
      workTime: 25,
      shortBreakTime: 5,
      longBreakTime: 15,
      sessionCount: 4,
      soundEnabled: !0,
      autoStartBreaks: !1,
      autoStartWork: !1,
      autoCheckTask: !1,
      showNotifications: !0,
      soundType: "default",
      soundVolume: 80
    };
    try {
      let s = localStorage.getItem(e);
      if (s) {
        let n = JSON.parse(s);
        o.settings.workTime = "number" == typeof n.workTime && n.workTime >= 1 && n.workTime <= 60 ? n.workTime : t.workTime, o.settings.shortBreakTime = "number" == typeof n.shortBreakTime && n.shortBreakTime >= 1 && n.shortBreakTime <= 30 ? n.shortBreakTime : t.shortBreakTime, o.settings.longBreakTime = "number" == typeof n.longBreakTime && n.longBreakTime >= 1 && n.longBreakTime <= 60 ? n.longBreakTime : t.longBreakTime, o.settings.sessionCount = "number" == typeof n.sessionCount && n.sessionCount >= 1 && n.sessionCount <= 10 ? n.sessionCount : t.sessionCount, o.settings.soundEnabled = void 0 !== n.soundEnabled ? !!n.soundEnabled : t.soundEnabled, o.settings.autoStartBreaks = !!n.autoStartBreaks, o.settings.autoStartWork = !!n.autoStartWork, o.settings.autoCheckTask = !!n.autoCheckTask, o.settings.showNotifications = void 0 !== n.showNotifications ? !!n.showNotifications : t.showNotifications, o.settings.soundType = n.soundType && i[n.soundType] ? n.soundType : t.soundType, o.settings.soundVolume = "number" == typeof n.soundVolume ? Math.max(0, Math.min(100, n.soundVolume)) : t.soundVolume
      } else Object.assign(o.settings, t)
    } catch (r) {
      console.error("Parse settings failed:", r), Object.assign(o.settings, t)
    }
    h(!0)
  }

  function c() {
    try {
      let e = localStorage.getItem(t);
      o.tasks = e ? JSON.parse(e) : []
    } catch (s) {
      console.error("Failed to load tasks:", s), o.tasks = []
    }
    K()
  }

  function g() {
    try {
      localStorage.setItem(t, JSON.stringify(o.tasks))
    } catch (e) {
      console.error("Failed to save tasks:", e)
    }
  }

  function k() {
    try {
      let e = localStorage.getItem(s);
      if (e) {
        let t = JSON.parse(e),
          n = new Date().toLocaleDateString();
        t.lastDate === n ? o.stats = t : (o.stats.todayCompleted = 0, o.stats.todayMinutes = 0, o.stats.lastDate = n, o.stats.totalCompleted = t.totalCompleted || 0)
      } else o.stats.lastDate = new Date().toLocaleDateString()
    } catch (i) {
      console.error("Failed to load stats:", i)
    }
    f()
  }

  function T() {
    try {
      localStorage.setItem(s, JSON.stringify(o.stats))
    } catch (e) {
      console.error("Failed to save stats:", e)
    }
  }

  function f() {
    let e = m.pomodoro.sessionStats;
    if (e) {
      let t = window.pomodoroTranslations?.statsTodayTemplate || "Today: {completed} sessions, {minutes} min";
      e.textContent = t.replace("{completed}", o.stats.todayCompleted).replace("{minutes}", o.stats.todayMinutes)
    }
  }

  function h(e = !1) {
    let {
      settings: t
    } = o;
    m.pomodoro.workTimeInput && (m.pomodoro.workTimeInput.value = t.workTime), m.pomodoro.shortBreakInput && (m.pomodoro.shortBreakInput.value = t.shortBreakTime), m.pomodoro.longBreakInput && (m.pomodoro.longBreakInput.value = t.longBreakTime), m.pomodoro.sessionsInput && (m.pomodoro.sessionsInput.value = t.sessionCount), m.pomodoro.soundToggle && (m.pomodoro.soundToggle.checked = t.soundEnabled), m.pomodoro.autoBreaksToggle && (m.pomodoro.autoBreaksToggle.checked = t.autoStartBreaks), m.pomodoro.autoWorkToggle && (m.pomodoro.autoWorkToggle.checked = t.autoStartWork), m.pomodoro.autoCheckToggle && (m.pomodoro.autoCheckToggle.checked = t.autoCheckTask), m.pomodoro.notificationToggle && (m.pomodoro.notificationToggle.checked = t.showNotifications), m.pomodoro.soundSelector && (m.pomodoro.soundSelector.value = t.soundType), m.pomodoro.volumeSlider && (m.pomodoro.volumeSlider.value = t.soundVolume), m.pomodoro.volumeValue && (m.pomodoro.volumeValue.textContent = `${t.soundVolume}%`), y(), (e || !o.pomodoro.isRunning) && w(), P(), b()
  }

  function B(e) {
    switch (e) {
      case "default":
        o.settings.workTime = 25, o.settings.shortBreakTime = 5, o.settings.longBreakTime = 15;
        break;
      case "short":
        o.settings.workTime = 15, o.settings.shortBreakTime = 3, o.settings.longBreakTime = 9;
        break;
      case "long":
        o.settings.workTime = 50, o.settings.shortBreakTime = 10, o.settings.longBreakTime = 30
    }
    p(), h()
  }

  function $() {
    o.tasks = o.tasks.filter(o => !o.completed), g(), K()
  }

  function y() {
    let e = m.pomodoro.presetButtons;
    if (!e || !e.length) return;
    e.forEach(o => o.classList.remove("active"));
    let t = {
      workTime: o.settings.workTime,
      shortBreakTime: o.settings.shortBreakTime,
      longBreakTime: o.settings.longBreakTime
    };
    for (let [s, n] of Object.entries({
        default: {
          workTime: 25,
          shortBreakTime: 5,
          longBreakTime: 15
        },
        short: {
          workTime: 15,
          shortBreakTime: 3,
          longBreakTime: 9
        },
        long: {
          workTime: 50,
          shortBreakTime: 10,
          longBreakTime: 30
        }
      }))
      if (t.workTime === n.workTime && t.shortBreakTime === n.shortBreakTime && t.longBreakTime === n.longBreakTime) {
        let i = e.find(o => o.dataset.preset === s);
        i && i.classList.add("active");
        break
      }
  }

  function b() {
    m.pomodoro.sessionTypeSelectors && m.pomodoro.sessionTypeSelectors.length && m.pomodoro.sessionTypeSelectors.forEach(e => {
      e.classList.toggle("active", e.dataset.type === o.pomodoro.type)
    })
  }

  function v(e) {
    if (!o.pomodoro.isRunning || o.pomodoro.isPaused) {
      switch (o.pomodoro.type = e, e) {
        case "work":
          o.pomodoro.timeRemaining = 60 * o.settings.workTime, o.pomodoro.initialTime = 60 * o.settings.workTime;
          break;
        case "shortBreak":
          o.pomodoro.timeRemaining = 60 * o.settings.shortBreakTime, o.pomodoro.initialTime = 60 * o.settings.shortBreakTime;
          break;
        case "longBreak":
          o.pomodoro.timeRemaining = 60 * o.settings.longBreakTime, o.pomodoro.initialTime = 60 * o.settings.longBreakTime
      }
      o.pomodoro.flipLast = {
        minutes: "",
        seconds: ""
      }, S(), C(), _(), b(), m.pomodoro.sessionProgressBar && (m.pomodoro.sessionProgressBar.style.width = "0%")
    }
  }

  function w() {
    W(), o.pomodoro.isPaused = !1, o.pomodoro.isRunning = !1, o.pomodoro.type = "work", o.pomodoro.timeRemaining = 60 * o.settings.workTime, o.pomodoro.initialTime = 60 * o.settings.workTime, o.pomodoro.flipLast = {
      minutes: "",
      seconds: ""
    }, C(), S(), _(), b(), m.pomodoro.sessionProgressBar && (m.pomodoro.sessionProgressBar.style.width = "0%")
  }

  function x(e, t) {
    if (o.pomodoro.flipLast[e] === t) return;
    let s = m.pomodoro,
      n = s[`${e}FlipTop`],
      i = s[`${e}FlipBottom`],
      r = s[`${e}TopText`],
      a = s[`${e}BottomText`],
      l = s[`${e}FlipTopText`],
      p = s[`${e}FlipBottomText`],
      u = s[`${e}Sr`];
    if (!r || !n) return;
    let c = "minutes" === e ? window.pomodoroTranslations?.timerMinutes || "minutes" : window.pomodoroTranslations?.timerSeconds || "seconds";
    if (u && d(u, `${t} ${c}`), "" === o.pomodoro.flipLast[e]) {
      d(r, t), d(a, t), d(l, t), d(p, t), o.pomodoro.flipLast[e] = t;
      return
    }
    d(r, t), d(l, o.pomodoro.flipLast[e]), d(p, t), n.classList.remove("flip-animate-top"), i.classList.remove("flip-animate-bottom"), n.offsetWidth, n.classList.add("flip-animate-top"), i.classList.add("flip-animate-bottom"), setTimeout(() => {
      a && d(a, t), o.pomodoro.flipLast[e] = t
    }, 300)
  }

  function C() {
    let e = o.pomodoro.timeRemaining,
      t = String(Math.floor(e / 60)).padStart(2, "0"),
      s = String(e % 60).padStart(2, "0");
    x("minutes", t), x("seconds", s)
  }

  function S() {
    let e = "",
      t = "";
    switch (o.pomodoro.type) {
      case "work":
        e = window.pomodoroTranslations?.sessionWork || "Work Session", t = n.work;
        break;
      case "shortBreak":
        e = window.pomodoroTranslations?.sessionShortBreak || "Short Break", t = n.shortBreak;
        break;
      case "longBreak":
        e = window.pomodoroTranslations?.sessionLongBreak || "Long Break", t = n.longBreak
    }
    d(m.pomodoro.sessionTypeDisplay, e), m.pomodoro.sessionTypeDisplay && (m.pomodoro.sessionTypeDisplay.style.color = t), l("--session-color", t), m.pomodoro.startPauseButton && (m.pomodoro.startPauseButton.style.backgroundColor = t), m.pomodoro.sessionProgressBar && (m.pomodoro.sessionProgressBar.style.backgroundColor = t)
  }

  function P() {
    let e = m.pomodoro.sessionCount;
    if (e) {
      e.innerHTML = "";
      for (let t = 0; t < o.settings.sessionCount; t++) {
        let s = document.createElement("div");
        s.classList.add("pomodoro-dot"), t < o.pomodoro.completedPomodoros && s.classList.add("completed"), t === o.pomodoro.completedPomodoros && "work" === o.pomodoro.type && s.classList.add("active"), e.appendChild(s)
      }
    }
  }

  function _() {
    let e = m.pomodoro.startPauseButton,
      t = e?.querySelector(".material-symbols-outlined"),
      s = e?.querySelector("span.sr-only"),
      n = m.pomodoro.resetButton,
      i = m.pomodoro.skipButton;
    if (!e || !t || !s || !n || !i) return;
    let r = window.pomodoroTranslations?.controlsStart || "Start",
      d = window.pomodoroTranslations?.controlsResume || "Resume",
      l = window.pomodoroTranslations?.controlsPause || "Pause";
    o.pomodoro.isRunning ? o.pomodoro.isPaused ? (t.textContent = "play_arrow", s.textContent = d, e.setAttribute("aria-label", d)) : (t.textContent = "pause", s.textContent = l, e.setAttribute("aria-label", l)) : (t.textContent = "play_arrow", s.textContent = r, e.setAttribute("aria-label", r));
    let p = o.pomodoro.isRunning;
    m.pomodoro.workTimeInput && (m.pomodoro.workTimeInput.disabled = p), m.pomodoro.shortBreakInput && (m.pomodoro.shortBreakInput.disabled = p), m.pomodoro.longBreakInput && (m.pomodoro.longBreakInput.disabled = p), m.pomodoro.sessionsInput && (m.pomodoro.sessionsInput.disabled = p), i.disabled = !o.pomodoro.isRunning;
    let u = "work" === o.pomodoro.type && o.pomodoro.timeRemaining === 60 * o.settings.workTime && !o.pomodoro.isRunning && 0 === o.pomodoro.completedPomodoros;
    n.disabled = u;
    let c = a(".time-button");
    c.forEach(o => {
      o.disabled = p
    });
    let g = o.pomodoro.isRunning && !o.pomodoro.isPaused;
    m.pomodoro.sessionTypeSelectors.forEach(o => {
      o.disabled = g, o.classList.toggle("disabled", g)
    })
  }

  function L() {
    let e = m.pomodoro.sessionProgressBar;
    if (!e) return;
    let t = o.pomodoro.initialTime,
      s = o.pomodoro.timeRemaining;
    e.style.width = `${Math.min(100,t>0?(t-s)/t*100:0)}%`
  }

  function E(e, t) {
    if (!o.settings.showNotifications || !("Notification" in window)) return;
    let s = () => new Notification(e, {
      body: t
    });
    "granted" === Notification.permission ? s() : "denied" === Notification.permission || o.notification.hasRequestedPermission || Notification.requestPermission().then(e => {
      o.notification.hasRequestedPermission = !0, "granted" === e && s()
    })
  }

  function I() {
    o.pomodoro.isRunning && !o.pomodoro.isPaused && (o.pomodoro.timeRemaining--, L(), o.pomodoro.timeRemaining < 0 ? R() : C())
  }

  function R() {
    o.settings.soundEnabled && M();
    let e = "",
      t = "",
      s = "",
      n = "";
    if ("work" === o.pomodoro.type) {
      o.pomodoro.completedPomodoros++, o.stats.totalCompleted++, o.stats.todayCompleted++;
      let i = Math.round(o.pomodoro.initialTime / 60);
      o.stats.todayMinutes += i, T(), f(), o.settings.autoCheckTask && o.pomodoro.activeTaskId && U(o.pomodoro.activeTaskId), P(), o.pomodoro.completedPomodoros % o.settings.sessionCount == 0 ? (o.pomodoro.type = "longBreak", o.pomodoro.timeRemaining = 60 * o.settings.longBreakTime, o.pomodoro.initialTime = 60 * o.settings.longBreakTime, s = window.pomodoroTranslations?.notifLongBreakTitle || "Long Break Time!", t = (n = window.pomodoroTranslations?.notifLongBreakBodyTemplate || "Take a {minutes} minute break after {sessions} sessions.").replace("{minutes}", o.settings.longBreakTime).replace("{sessions}", o.settings.sessionCount)) : (o.pomodoro.type = "shortBreak", o.pomodoro.timeRemaining = 60 * o.settings.shortBreakTime, o.pomodoro.initialTime = 60 * o.settings.shortBreakTime, s = window.pomodoroTranslations?.notifShortBreakTitle || "Short Break Time!", t = (n = window.pomodoroTranslations?.notifShortBreakBodyTemplate || "Take a {minutes} minute break. Session {completed}/{total}.").replace("{minutes}", o.settings.shortBreakTime).replace("{completed}", o.pomodoro.completedPomodoros).replace("{total}", o.settings.sessionCount)), o.settings.autoStartBreaks || F()
    } else o.pomodoro.type = "work", o.pomodoro.timeRemaining = 60 * o.settings.workTime, o.pomodoro.initialTime = 60 * o.settings.workTime, s = window.pomodoroTranslations?.notifBreakCompleteTitle || "Break Over!", t = (n = window.pomodoroTranslations?.notifBreakCompleteBodyTemplate || "Time to start your next {minutes} minute work session.").replace("{minutes}", o.settings.workTime), o.settings.autoStartWork || F();
    E(e = s, t), m.pomodoro.sessionProgressBar && (m.pomodoro.sessionProgressBar.style.width = "0%"), o.pomodoro.flipLast = {
      minutes: "",
      seconds: ""
    }, S(), C(), _(), b()
  }

  function A() {
    (!o.pomodoro.isRunning || o.pomodoro.isPaused) && (q(), "granted" === Notification.permission || "denied" === Notification.permission || o.notification.hasRequestedPermission || Notification.requestPermission().then(e => {
      o.notification.hasRequestedPermission = !0, console.log("Notification permission:", e)
    }), o.pomodoro.isRunning = !0, o.pomodoro.isPaused = !1, W(), o.pomodoro.intervalId = setInterval(I, 1e3), _(), S())
  }

  function F() {
    o.pomodoro.isRunning && !o.pomodoro.isPaused && (o.pomodoro.isPaused = !0, W(), _())
  }

  function V() {
    o.pomodoro.isRunning && (o.pomodoro.timeRemaining = 0, I())
  }

  function W() {
    o.pomodoro.intervalId && (clearInterval(o.pomodoro.intervalId), o.pomodoro.intervalId = null)
  }

  function D() {
    o.pomodoro.completedPomodoros = 0, w(), P()
  }

  function q() {
    if (!o.pomodoro.audioContext && ("undefined" != typeof AudioContext || "undefined" != typeof webkitAudioContext)) try {
      o.pomodoro.audioContext = new(window.AudioContext || window.webkitAudioContext), "suspended" === o.pomodoro.audioContext.state && o.pomodoro.audioContext.resume(), N()
    } catch (e) {
      console.warn("Audio context failed:", e), o.pomodoro.audioContext = null, m.pomodoro.soundToggle && (m.pomodoro.soundToggle.disabled = !0, m.pomodoro.soundToggle.checked = !1), o.settings.soundEnabled = !1
    }
  }
  async function N() {
    if (o.pomodoro.audioContext) {
      for (let [e, t] of Object.entries(i))
        if (!o.soundBuffers[e] && t) try {
          let s = await fetch(t);
          if (!s.ok) throw Error(`HTTP error! status: ${s.status} for ${t}`);
          let n = await s.arrayBuffer();
          o.soundBuffers[e] = await o.pomodoro.audioContext.decodeAudioData(n)
        } catch (r) {
          console.error(`Failed to load sound ${e}:`, r)
        }
    }
  }

  function M() {
    if (!o.settings.soundEnabled || !o.pomodoro.audioContext || o.isPlayingTestSound) return;
    let e = o.settings.soundType,
      t = o.soundBuffers[e];
    if (!t) {
      console.warn(`Sound buffer for "${e}" not loaded.`);
      return
    }
    try {
      "suspended" === o.pomodoro.audioContext.state && o.pomodoro.audioContext.resume();
      let s = o.pomodoro.audioContext.createBufferSource();
      s.buffer = t;
      let n = o.pomodoro.audioContext.createGain();
      n.gain.setValueAtTime(o.settings.soundVolume / 100, o.pomodoro.audioContext.currentTime), s.connect(n), n.connect(o.pomodoro.audioContext.destination), s.start(0)
    } catch (i) {
      console.error("Play sound error:", i)
    }
  }

  function z() {
    let e = m.tasks.input.value.trim();
    if (!e) return;
    let t = {
      id: Date.now(),
      text: e,
      completed: !1,
      createdAt: new Date().toISOString()
    };
    o.tasks.unshift(t), g(), K(), m.tasks.input.value = "", m.tasks.input.focus()
  }

  function O() {
    if (!o.pomodoro.audioContext || o.isPlayingTestSound) return;
    let e = o.settings.soundType,
      t = o.soundBuffers[e],
      s = m.pomodoro.testSoundBtn;
    if (!t) {
      console.warn(`Test sound buffer for "${e}" not loaded.`), alert("Sound file not loaded or failed to load.");
      return
    }
    try {
      "suspended" === o.pomodoro.audioContext.state && o.pomodoro.audioContext.resume(), o.isPlayingTestSound = !0, s && (s.disabled = !0);
      let n = o.pomodoro.audioContext.createBufferSource();
      n.buffer = t;
      let i = o.pomodoro.audioContext.createGain();
      i.gain.setValueAtTime(o.settings.soundVolume / 100, o.pomodoro.audioContext.currentTime), n.connect(i), i.connect(o.pomodoro.audioContext.destination), n.start(0), n.onended = () => {
        o.isPlayingTestSound = !1, s && (s.disabled = !1)
      }
    } catch (r) {
      console.error("Test sound error:", r), o.isPlayingTestSound = !1, s && (s.disabled = !1)
    }
  }

  function H() {
    let o = document.getElementById("confetti-canvas");
    return o || ((o = document.createElement("canvas")).id = "confetti-canvas", Object.assign(o.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "1000"
    }), document.body.appendChild(o)), o.width = window.innerWidth, o.height = window.innerHeight, o
  }

  function X(o) {
    let e = document.getElementById("success-message");
    e && document.body.removeChild(e);
    let t = document.createElement("div");
    t.id = "success-message", t.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;"><span class="material-symbols-outlined" style="font-size: 24px;">celebration</span><span>${o}</span></div>`, Object.assign(t.style, {
      position: "fixed",
      bottom: "2%",
      left: "50%",
      transform: "translateX(-50%) translateY(-20px)",
      backgroundColor: "var(--surface-color)",
      color: "var(--primary-text)",
      padding: "16px 24px",
      borderRadius: "12px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
      zIndex: "1001",
      fontWeight: "600",
      fontSize: "1.15rem",
      opacity: "0",
      transition: "opacity 0.4s ease, transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)",
      border: "1px solid var(--divider-color)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      borderLeft: "4px solid var(--success-color)"
    }), document.body.appendChild(t), setTimeout(() => {
      t.style.opacity = "1", t.style.transform = "translateX(-50%) translateY(0)"
    }, 10), setTimeout(() => {
      t.style.opacity = "0", t.style.transform = "translateX(-50%) translateY(-20px)", setTimeout(() => {
        t.parentNode && document.body.removeChild(t)
      }, 400)
    }, 3500)
  }

  function Y() {
    let o = H(),
      e = o.getContext("2d"),
      t = ["#ff453a", "#30d158", "#0a84ff", "#ff9f0a"],
      s = [];
    for (let n = 0; n < 40; n++) s.push({
      x: Math.random() * o.width,
      y: Math.random() * o.height / 3,
      size: 5 * Math.random() + 2,
      color: t[Math.floor(Math.random() * t.length)],
      speedY: 2 * Math.random() + 1,
      speedX: 2 * Math.random() - 1,
      rotation: 360 * Math.random(),
      spin: (Math.random() - .5) * 10
    });
    let i;
    ! function t() {
      e.clearRect(0, 0, o.width, o.height);
      let n = !1;
      s.forEach(t => {
        t.y < o.height && (n = !0, t.y += t.speedY, t.x += t.speedX, t.rotation += t.spin, e.save(), e.translate(t.x, t.y), e.rotate(t.rotation * Math.PI / 180), e.fillStyle = t.color, e.fillRect(-t.size / 2, -t.size / 2, t.size, t.size), e.restore())
      }), n ? i = requestAnimationFrame(t) : o.parentNode && o.remove()
    }(), setTimeout(() => {
      i && cancelAnimationFrame(i), o.parentNode && o.remove()
    }, 3e3)
  }

  function G(e) {
    let t = o.tasks.find(o => o.id === e);
    if (!t) return;
    let s = t.completed;
    if (t.completed = !t.completed, g(), K(), !s && t.completed) {
      let n = o.tasks.length > 0 && o.tasks.every(o => o.completed);
      if (n) {
        let i = window.pomodoroTranslations?.taskAllComplete || "All tasks completed!";
        X(i), Y()
      } else Y()
    }
  }

  function U(e) {
    let t = o.tasks.find(o => o.id === e);
    t && !t.completed && (t.completed = !0, g(), K())
  }

  function j(e) {
    o.pomodoro.activeTaskId === e && (o.pomodoro.activeTaskId = null), o.tasks = o.tasks.filter(o => o.id !== e), g(), K()
  }

  function J(e) {
    o.pomodoro.activeTaskId = o.pomodoro.activeTaskId === e ? null : e, K()
  }

  function K() {
    let e = m.tasks.list,
      t = m.tasks.noTasksMessage;
    if (!e || !t) return;
    e.innerHTML = "", t.style.display = 0 === o.tasks.length ? "block" : "none";
    let s = window.pomodoroTranslations?.taskFocusAria || "Set as active task",
      n = window.pomodoroTranslations?.taskUnfocusAria || "Remove as active task",
      i = window.pomodoroTranslations?.taskDeleteAria || "Delete task";
    o.tasks.forEach(t => {
      let r = document.createElement("li");
      r.classList.add("task-item"), o.pomodoro.activeTaskId === t.id && r.classList.add("active"), t.completed && r.classList.add("completed"), r.innerHTML = `
       <div class="task-content">
         <input type="checkbox" class="task-checkbox" ${t.completed?"checked":""} aria-label="Toggle task ${t.text}">
         <span class="task-text">${t.text}</span>
       </div>
       <div class="task-actions">
         <button class="task-btn focus-btn" aria-label="${o.pomodoro.activeTaskId===t.id?n:s}">
           <span class="material-symbols-outlined">${o.pomodoro.activeTaskId===t.id?"cancel":"target"}</span>
         </button>
         <button class="task-btn delete-btn" aria-label="${i}">
           <span class="material-symbols-outlined">delete</span>
         </button>
       </div>`;
      let a = r.querySelector(".task-checkbox"),
        d = r.querySelector(".focus-btn"),
        l = r.querySelector(".delete-btn");
      a.addEventListener("change", () => G(t.id)), d.addEventListener("click", () => J(t.id)), l.addEventListener("click", () => j(t.id)), e.appendChild(r)
    })
  }

  function Q() {
    m.pomodoro.startPauseButton && m.pomodoro.startPauseButton.addEventListener("click", () => {
      q(), !o.pomodoro.isRunning || o.pomodoro.isPaused ? A() : F()
    }), m.pomodoro.resetButton && m.pomodoro.resetButton.addEventListener("click", D), m.pomodoro.skipButton && m.pomodoro.skipButton.addEventListener("click", V), m.pomodoro.sessionTypeSelectors.forEach(e => {
      e.addEventListener("click", () => {
        if (o.pomodoro.isRunning && !o.pomodoro.isPaused) return;
        let t = e.dataset.type;
        t && v(t)
      })
    }), m.tasks.addButton && m.tasks.addButton.addEventListener("click", z), m.tasks.input && m.tasks.input.addEventListener("keydown", o => {
      "Enter" === o.key && z()
    }), m.tasks.clearCompletedBtn && m.tasks.clearCompletedBtn.addEventListener("click", $), m.pomodoro.presetButtons && m.pomodoro.presetButtons.forEach(o => {
      o.addEventListener("click", () => {
        B(o.dataset.preset)
      })
    }), m.pomodoro.soundSelector && m.pomodoro.soundSelector.addEventListener("change", e => {
      o.settings.soundType = e.target.value, p()
    }), m.pomodoro.testSoundBtn && m.pomodoro.testSoundBtn.addEventListener("click", () => {
      q(), O()
    }), m.pomodoro.volumeSlider && (m.pomodoro.volumeSlider.addEventListener("input", e => {
      let t = parseInt(e.target.value, 10);
      o.settings.soundVolume = t, m.pomodoro.volumeValue && (m.pomodoro.volumeValue.textContent = `${t}%`)
    }), m.pomodoro.volumeSlider.addEventListener("change", p)), m.pomodoro.notificationToggle && m.pomodoro.notificationToggle.addEventListener("change", e => {
      o.settings.showNotifications = e.target.checked, p()
    });
    let e = [m.pomodoro.workTimeInput, m.pomodoro.shortBreakInput, m.pomodoro.longBreakInput, m.pomodoro.sessionsInput];
    e.forEach(e => {
      e && e.addEventListener("change", e => {
        let t = e.target.id,
          s = parseInt(e.target.value) || 0,
          n = "",
          i = 60;
        switch (t) {
          case "pomodoro-work-time":
            n = "workTime", i = 60;
            break;
          case "pomodoro-short-break":
            n = "shortBreakTime", i = 30;
            break;
          case "pomodoro-long-break":
            n = "longBreakTime", i = 60;
            break;
          case "pomodoro-sessions":
            n = "sessionCount", i = 10
        }
        n && (s = Math.max(1, Math.min(i, s)), e.target.value = s, o.settings[n] = s, o.pomodoro.isRunning || ("workTime" === n && "work" === o.pomodoro.type ? o.pomodoro.initialTime = o.pomodoro.timeRemaining = 60 * s : "shortBreakTime" === n && "shortBreak" === o.pomodoro.type ? o.pomodoro.initialTime = o.pomodoro.timeRemaining = 60 * s : "longBreakTime" === n && "longBreak" === o.pomodoro.type ? o.pomodoro.initialTime = o.pomodoro.timeRemaining = 60 * s : "sessionCount" === n && P(), C(), _()), p(), y())
      })
    });
    let t = a(".time-button");
    t.forEach(o => {
      o.addEventListener("click", () => {
        let e = o.dataset.target,
          t = o.dataset.action,
          s = document.getElementById(e);
        if (!s) return;
        let n = parseInt(s.value) || 0;
        "increase" === t ? n++ : "decrease" === t && n--, s.value = n, s.dispatchEvent(new Event("change"))
      })
    }), m.pomodoro.soundToggle && m.pomodoro.soundToggle.addEventListener("change", e => {
      o.settings.soundEnabled = e.target.checked, p()
    }), m.pomodoro.autoBreaksToggle && m.pomodoro.autoBreaksToggle.addEventListener("change", e => {
      o.settings.autoStartBreaks = e.target.checked, p()
    }), m.pomodoro.autoWorkToggle && m.pomodoro.autoWorkToggle.addEventListener("change", e => {
      o.settings.autoStartWork = e.target.checked, p()
    }), m.pomodoro.autoCheckToggle && m.pomodoro.autoCheckToggle.addEventListener("change", e => {
      o.settings.autoCheckTask = e.target.checked, p()
    })
  }

  function Z() {
    u(), c(), k(), q(), Q(), w(), P(), console.log("Pomodoro Timer Initialized")
  }
  window.toggleSettingsPanel = e => {
    let t = m.settingsPanel,
      s = document.getElementById("settings-toggle"),
      n = m.closeSettingsButton;
    e !== o.isSettingsOpen && t && s && (o.isSettingsOpen = e, t.classList.toggle("open", e), t.setAttribute("aria-hidden", !e), s.setAttribute("aria-expanded", e), e ? (window.closeAllPopups && window.closeAllPopups("isSettingsOpen"), n && n.focus()) : s && s.focus(), document.body.classList.toggle("popup-active", e))
  }, window.addEventListener("beforeunload", W), Z()
});
