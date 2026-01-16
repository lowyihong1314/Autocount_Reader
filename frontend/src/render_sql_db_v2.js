let saveTimer = null;
let tableBoxes = []; // 全局作用域变量
let selectedField = null; // { table: string, column: string }

export async function render_sql_db_v2() {
  const base = document.getElementById("app");
  if (!base) return;

  base.innerHTML = "Loading SQL Server schema...";

  let data;
  try {
    const res = await fetch("/api/db/sqlserver/schema");
    if (!res.ok) throw new Error(res.statusText);
    data = await res.json();
  } catch (err) {
    base.innerHTML = `<pre style="color:red">API error: ${err.message}</pre>`;
    return;
  }

  const { tables = [], relations = [] } = data;

  base.innerHTML = "";
  const canvas = document.createElement("canvas");
  canvas.width = base.clientWidth;
  canvas.height = window.innerHeight;
  base.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  // 拖动画布用
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let isDraggingCanvas = false;
  let lastX = 0;
  let lastY = 0;

  // 拖动表格用
  let draggingTable = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  tableBoxes = tables.map((t, i) => ({
    ...t,
    x: typeof t.x === "number" ? t.x : 100 + (i % 4) * 300,
    y: typeof t.y === "number" ? t.y : 80 + Math.floor(i / 4) * 200,
    width: typeof t.w === "number" ? t.w : 240,
    height: typeof t.h === "number" ? t.h : 40 + (t.columns?.length || 0) * 20,
  }));

  function saveTableLocations() {
    const payload = tableBoxes.map((t) => ({
      table_name: t.table,
      x: t.x,
      y: t.y,
      w: t.width,
      h: t.height,
      hidden: t.hidden || false,
      note: t.note || "",
    }));

    fetch("/api/db/sqlserver/schema/save_location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.error("save_location failed", err);
    });
  }
  function generate_search_table() {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "12px";
    container.style.left = "12px";
    container.style.zIndex = "10";
    container.style.background = "#fff";
    container.style.padding = "6px 10px";
    container.style.borderRadius = "6px";
    container.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
    container.style.fontFamily = "monospace";
    container.style.fontSize = "14px";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Search table...";
    input.style.width = "200px";
    input.style.padding = "4px 6px";
    input.style.border = "1px solid #ccc";
    input.style.borderRadius = "4px";

    container.appendChild(input);
    document.body.appendChild(container);

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const keyword = input.value.trim().toLowerCase();
        if (!keyword) return;

        const t = tableBoxes.find((tb) =>
          tb.table.toLowerCase().includes(keyword)
        );

        if (!t) {
          alert("No match found");
          return;
        }

        // 目标表中心点
        const centerX = t.x + t.width / 2;
        const centerY = t.y + t.height / 2;

        // 画布尺寸
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        // 缩放保持不变，仅更新 offset，使目标居中
        offsetX = canvasWidth / 2 - centerX * scale;
        offsetY = canvasHeight / 2 - centerY * scale;

        draw();
      }
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // 字体预设
    ctx.font = "12px monospace";

    // ---------- 表格 ----------
    for (let i = 0; i < tableBoxes.length; i++) {
      const t = tableBoxes[i];

      // 默认定位与尺寸
      if (typeof t.x !== "number") t.x = 100 + (i % 4) * 300;
      if (typeof t.y !== "number") t.y = 80 + Math.floor(i / 4) * 200;
      if (typeof t.width !== "number") t.width = 240;
      if (typeof t.height !== "number") {
        const colCount = t.columns?.length || 0;
        t.height = 40 + colCount * 20;
      }

      const radius = 8;

      // 阴影
      ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // 表背景整体
      ctx.fillStyle = "#ffffff";
      roundRect(ctx, t.x, t.y, t.width, t.height, radius);
      ctx.fill();

      ctx.shadowColor = "transparent"; // 清除阴影

      // 表头背景
      ctx.fillStyle = "#0066cc";
      roundRect(ctx, t.x, t.y, t.width, 28, {
        tl: radius,
        tr: radius,
        br: 0,
        bl: 0,
      });
      ctx.fill();

      // 表头文字
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px monospace";
      ctx.fillText(`${t.schema}.${t.table}`, t.x + 12, t.y + 18);

      // 字段区域背景
      ctx.fillStyle = "#f9f9f9";
      ctx.fillRect(t.x, t.y + 28, t.width, t.height - 28);

      // 字段文字
      ctx.font = "12px monospace";
      t.columns?.forEach((c, j) => {
        const cy = t.y + 44 + j * 20;

        // 高亮选中字段
        const isSelected =
          selectedField &&
          selectedField.table === t.table &&
          selectedField.column === c.name;

        if (isSelected) {
          ctx.fillStyle = "#fff3e0";
          ctx.fillRect(t.x + 4, cy - 14, t.width - 8, 18);
          ctx.fillStyle = "#d84315";
          ctx.font = "bold 12px monospace";
        } else {
          ctx.fillStyle = "#333";
          ctx.font = "12px monospace";
        }

        ctx.fillText(
          `${c.name}: ${c.type}${c.isNullable ? "?" : ""}`,
          t.x + 12,
          cy
        );
      });
    }

    // ---------- 查找字段Y坐标 ----------
    function getColumnY(table, columnName) {
      const index = table.columns.findIndex((c) => c.name === columnName);
      if (index === -1) return table.y + 20;
      return table.y + 44 + index * 20;
    }

    // ---------- 绘制关系连线 ----------
    for (const r of relations) {
      const from = tableBoxes.find((t) => t.table === r.fromTable);
      const to = tableBoxes.find((t) => t.table === r.toTable);
      if (!from || !to) continue;

      const fromY = getColumnY(from, r.fromColumn);
      const toY = getColumnY(to, r.toColumn);

      const isActive =
        selectedField &&
        ((r.fromTable === selectedField.table &&
          r.fromColumn === selectedField.column) ||
          (r.toTable === selectedField.table &&
            r.toColumn === selectedField.column));

      const fromX = from.x + (from.x < to.x ? from.width : 0);
      const toX = to.x + (from.x < to.x ? 0 : to.width);
      const midX = fromX + (toX - fromX) * 0.5;

      ctx.strokeStyle = isActive ? "#ff4081" : "rgba(180, 180, 180, 0.7)";
      ctx.lineWidth = isActive ? 2.5 : 1;

      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.bezierCurveTo(midX, fromY, midX, toY, toX, toY);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ---------- 工具函数：绘制圆角矩形 ----------
  function roundRect(ctx, x, y, width, height, radius) {
    if (typeof radius === "number") {
      radius = { tl: radius, tr: radius, br: radius, bl: radius };
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius.br,
      y + height
    );
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
  }

  draw();

  // ---------- 鼠标事件 ----------
  canvas.addEventListener("mousedown", (e) => {
    const [x, y] = screenToWorld(e.offsetX, e.offsetY);

    // 👉 优先检测是否点中字段
    for (const t of tableBoxes) {
      const startY = t.y + 40;
      for (let i = 0; i < (t.columns?.length || 0); i++) {
        const cy = startY + i * 20;
        if (x >= t.x && x <= t.x + t.width && y >= cy - 10 && y <= cy + 10) {
          selectedField = { table: t.table, column: t.columns[i].name };
          draw();
          return;
        }
      }
    }

    // 👉 如果不是字段，再判断是否点击表格，准备拖动
    for (const t of tableBoxes.slice().reverse()) {
      if (x >= t.x && x <= t.x + t.width && y >= t.y && y <= t.y + t.height) {
        draggingTable = t;
        dragOffsetX = x - t.x;
        dragOffsetY = y - t.y;
        return;
      }
    }

    // 👉 否则点击空白区域，开始拖动画布
    selectedField = null;
    isDraggingCanvas = true;
    lastX = e.clientX;
    lastY = e.clientY;
    draw();
  });

  canvas.addEventListener("mousemove", (e) => {
    const [x, y] = screenToWorld(e.offsetX, e.offsetY);

    if (draggingTable) {
      draggingTable.x = x - dragOffsetX;
      draggingTable.y = y - dragOffsetY;
      draw();
    } else if (isDraggingCanvas) {
      offsetX += e.clientX - lastX;
      offsetY += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      draw();
    }
  });

  canvas.addEventListener("mouseup", () => {
    if (draggingTable) {
      // 防抖：避免连续触发
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveTableLocations, 300);
    }

    draggingTable = null;
    isDraggingCanvas = false;
  });

  canvas.addEventListener("mouseleave", () => {
    if (draggingTable) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveTableLocations, 300);
    }

    draggingTable = null;
    isDraggingCanvas = false;
  });

  // 缩放
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();

    const zoomFactor = 1.1;
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;

    // 当前世界坐标
    const worldX = (mouseX - offsetX) / scale;
    const worldY = (mouseY - offsetY) / scale;

    // 更新 scale
    const delta = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
    const newScale = scale * delta;

    // 更新 offset，让鼠标点保持在缩放前的位置
    offsetX = mouseX - worldX * newScale;
    offsetY = mouseY - worldY * newScale;
    scale = newScale;

    draw();
  });

  // ---------- 辅助函数 ----------
  function screenToWorld(sx, sy) {
    return [(sx - offsetX) / scale, (sy - offsetY) / scale];
  }
  generate_search_table();
}
