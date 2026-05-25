// content.js – StreamInk
// Injects a canvas overlay + toolbar for on-page drawing

(() => {
  "use strict";

  // Prevent double-injection
  if (document.getElementById("streamink-canvas")) return;

  // ===================== CROSS-BROWSER SHIM =====================
  const api = typeof browser !== "undefined" ? browser : chrome;

  // ===================== STATE =====================
  const state = {
    active: false,
    tool: "pen",        // pen | line | rect | circle | eraser
    color: "#ef4444",
    size: 4,
    drawing: false,
    strokes: [],        // finished strokes for undo
    currentStroke: null, // in-progress stroke
    startX: 0,
    startY: 0,
  };

  const COLORS = [
    "#ef4444", // red
    "#f59e0b", // amber
    "#22c55e", // green
    "#3b82f6", // blue
    "#a855f7", // purple
    "#ec4899", // pink
    "#ffffff", // white
    "#000000", // black
  ];

  // ===================== DOM SETUP =====================

  // --- Canvas ---
  const canvas = document.createElement("canvas");
  canvas.id = "streamink-canvas";
  document.documentElement.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // --- Eraser cursor ---
  const eraserCursor = document.createElement("div");
  eraserCursor.id = "streamink-eraser-cursor";
  document.documentElement.appendChild(eraserCursor);

  // --- Active indicator ---
  const indicator = document.createElement("div");
  indicator.id = "streamink-indicator";
  indicator.innerHTML = '<span class="streamink-dot"></span> DRAW MODE';
  document.documentElement.appendChild(indicator);

  // --- Toolbar ---
  const toolbar = document.createElement("div");
  toolbar.id = "streamink-toolbar";
  toolbar.innerHTML = buildToolbarHTML();
  document.documentElement.appendChild(toolbar);

  function buildToolbarHTML() {
    return `
      <div class="streamink-section">
        <span class="streamink-section-label">Tools</span>
        <button class="streamink-btn selected" data-tool="pen" title="Pen (P)">
          <svg viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
        </button>
        <button class="streamink-btn" data-tool="line" title="Line (L)">
          <svg viewBox="0 0 24 24"><line x1="5" y1="19" x2="19" y2="5"/></svg>
        </button>
        <button class="streamink-btn" data-tool="rect" title="Rectangle (R)">
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        </button>
        <button class="streamink-btn" data-tool="circle" title="Circle (O)">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg>
        </button>
        <button class="streamink-btn" data-tool="eraser" title="Eraser (E)">
          <svg viewBox="0 0 24 24"><path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L14.8 1.4c.8-.8 2-.8 2.8 0l5 5c.8.8.8 2 0 2.8L12 20"/><path d="M6 12l6-6"/></svg>
        </button>
      </div>

      <div class="streamink-divider"></div>

      <div class="streamink-section">
        <span class="streamink-section-label">Color</span>
        ${COLORS.map((c, i) => `<button class="streamink-color${i === 0 ? " selected" : ""}" data-color="${c}" style="background:${c}" title="${c}"></button>`).join("")}
      </div>

      <div class="streamink-divider"></div>

      <div class="streamink-section">
        <span class="streamink-section-label">Size</span>
        <input type="range" id="streamink-size-slider" min="1" max="30" value="${state.size}">
        <span id="streamink-size-preview">${state.size}px</span>
      </div>

      <div class="streamink-divider"></div>

      <div class="streamink-section">
        <button class="streamink-btn" data-action="undo" title="Undo (Ctrl+Z)">
          <svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        </button>
        <button class="streamink-btn" data-action="clear" title="Clear All (Alt+C)">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
        <button class="streamink-btn" data-action="minimize" title="Minimize toolbar">
          <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
    `;
  }

  // ===================== TOOLBAR EVENTS =====================

  toolbar.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tool]");
    if (btn) {
      state.tool = btn.dataset.tool;
      toolbar.querySelectorAll("[data-tool]").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      canvas.classList.toggle("eraser-mode", state.tool === "eraser");
      return;
    }
    const colorBtn = e.target.closest("[data-color]");
    if (colorBtn) {
      state.color = colorBtn.dataset.color;
      toolbar.querySelectorAll(".streamink-color").forEach((b) => b.classList.remove("selected"));
      colorBtn.classList.add("selected");
      return;
    }
    const actionBtn = e.target.closest("[data-action]");
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      if (action === "undo") undo();
      else if (action === "clear") clearAll();
      else if (action === "minimize") {
        toolbar.classList.toggle("minimized");
      }
    }
  });

  // Prevent toolbar clicks from bleeding through
  toolbar.addEventListener("mousedown", (e) => e.stopPropagation());
  toolbar.addEventListener("pointerdown", (e) => e.stopPropagation());

  const sizeSlider = toolbar.querySelector("#streamink-size-slider");
  const sizePreview = toolbar.querySelector("#streamink-size-preview");
  sizeSlider.addEventListener("input", () => {
    state.size = parseInt(sizeSlider.value, 10);
    sizePreview.textContent = state.size + "px";
  });

  // ===================== DRAWING =====================

  function getPos(e) {
    return { x: e.clientX, y: e.clientY };
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (!state.active) return;
    state.drawing = true;
    const pos = getPos(e);
    state.startX = pos.x;
    state.startY = pos.y;

    if (state.tool === "pen" || state.tool === "eraser") {
      state.currentStroke = {
        tool: state.tool,
        color: state.tool === "eraser" ? null : state.color,
        size: state.size,
        points: [pos],
      };
    } else {
      state.currentStroke = {
        tool: state.tool,
        color: state.color,
        size: state.size,
        x1: pos.x,
        y1: pos.y,
        x2: pos.x,
        y2: pos.y,
      };
    }
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointermove", (e) => {
    // Update eraser cursor position
    if (state.tool === "eraser" && state.active) {
      eraserCursor.style.left = e.clientX + "px";
      eraserCursor.style.top = e.clientY + "px";
      eraserCursor.style.width = state.size * 2 + "px";
      eraserCursor.style.height = state.size * 2 + "px";
      eraserCursor.style.display = "block";
    }

    if (!state.drawing || !state.currentStroke) return;
    const pos = getPos(e);

    if (state.tool === "pen" || state.tool === "eraser") {
      state.currentStroke.points.push(pos);
    } else {
      state.currentStroke.x2 = pos.x;
      state.currentStroke.y2 = pos.y;
    }
    redraw();
  });

  canvas.addEventListener("pointerup", () => {
    if (!state.drawing || !state.currentStroke) return;
    state.drawing = false;
    state.strokes.push(state.currentStroke);
    state.currentStroke = null;
    redraw();
  });

  canvas.addEventListener("pointerleave", () => {
    eraserCursor.style.display = "none";
  });

  canvas.addEventListener("pointerenter", () => {
    if (state.tool === "eraser" && state.active) {
      eraserCursor.style.display = "block";
    }
  });

  // ===================== RENDER =====================

  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of state.strokes) {
      drawStroke(stroke);
    }
    if (state.currentStroke) {
      drawStroke(state.currentStroke);
    }
  }

  function drawStroke(s) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (s.tool === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size;
      drawFreehand(s.points);
    } else if (s.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = s.size * 2;
      drawFreehand(s.points);
      ctx.globalCompositeOperation = "source-over";
    } else if (s.tool === "line") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    } else if (s.tool === "rect") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size;
      ctx.strokeRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
    } else if (s.tool === "circle") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size;
      const rx = Math.abs(s.x2 - s.x1) / 2;
      const ry = Math.abs(s.y2 - s.y1) / 2;
      const cx = (s.x1 + s.x2) / 2;
      const cy = (s.y1 + s.y2) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawFreehand(points) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    // Smooth curve through points
    if (points.length === 2) {
      ctx.lineTo(points[1].x, points[1].y);
    } else {
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);
    }
    ctx.stroke();
  }

  // ===================== ACTIONS =====================

  function undo() {
    state.strokes.pop();
    redraw();
  }

  function clearAll() {
    state.strokes = [];
    state.currentStroke = null;
    redraw();
  }

  function toggleActive() {
    state.active = !state.active;
    canvas.classList.toggle("active", state.active);
    toolbar.classList.toggle("visible", state.active);
    indicator.classList.toggle("visible", state.active);
    if (!state.active) {
      eraserCursor.style.display = "none";
    }
  }

  // ===================== KEYBOARD SHORTCUTS =====================

  document.addEventListener("keydown", (e) => {
    if (!state.active) return;

    // Tool shortcuts (only when draw mode is active)
    if (e.key === "p" || e.key === "P") {
      selectToolByKey("pen");
    } else if (e.key === "l" || e.key === "L") {
      selectToolByKey("line");
    } else if (e.key === "r" || e.key === "R") {
      selectToolByKey("rect");
    } else if (e.key === "o" || e.key === "O") {
      selectToolByKey("circle");
    } else if (e.key === "e" || e.key === "E") {
      selectToolByKey("eraser");
    } else if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      undo();
    } else if (e.key === "Escape") {
      toggleActive();
    }
  });

  function selectToolByKey(tool) {
    state.tool = tool;
    toolbar.querySelectorAll("[data-tool]").forEach((b) => b.classList.remove("selected"));
    const btn = toolbar.querySelector(`[data-tool="${tool}"]`);
    if (btn) btn.classList.add("selected");
    canvas.classList.toggle("eraser-mode", tool === "eraser");
  }

  // ===================== MESSAGES FROM BACKGROUND =====================

  api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "toggle-draw") toggleActive();
    else if (msg.action === "clear-canvas") clearAll();
    sendResponse({ ok: true });
  });

})();
