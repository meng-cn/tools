<script setup lang="ts">
import { ref, watch } from 'vue'

const userInput = ref('')
const imageUrls = ref<string[]>([])
const fontSize = ref(48)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

// A4 ratio: 1:√2
const CANVAS_WIDTH = 595
const CANVAS_HEIGHT = 842
const MARGIN = 40

/** 字符项 */
interface CharItem {
  char: string
  /** 该字符后是否强制换行（对应输入中的换行） */
  breakAfter: boolean
}

/** 渲染一页，返回 dataURL 和下一个起始索引 */
function renderPage(
  items: CharItem[],
  startIndex: number,
  titleCharCount: number,
  isFirstPage: boolean,
  pageNum: number,
): { dataUrl: string; nextIndex: number } {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const ctx = canvas.getContext('2d')!

  // 白色背景
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  const cellSize = fontSize.value
  const cols = Math.floor((CANVAS_WIDTH - MARGIN * 2) / cellSize)
  const marginLeft = (CANVAS_WIDTH - cols * cellSize) / 2

  // 页码区域
  const footerHeight = 36
  const startY = MARGIN
  const maxRows = Math.floor((CANVAS_HEIGHT - startY - MARGIN - footerHeight) / cellSize)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // 辅助：补齐指定范围内的空格子
  function fillRowEmpty(fromCol: number, toCol: number, r: number) {
    for (let c = fromCol; c < toCol; c++) {
      drawMiZiGe(ctx, marginLeft + c * cellSize, startY + r * cellSize, cellSize)
    }
  }

  let row = 0
  let col = 0
  let idx = startIndex

  // --- 标题行（仅首页首行，居中排列）---
  if (isFirstPage && titleCharCount > 0 && startIndex === 0) {
    const startCol = Math.floor((cols - titleCharCount) / 2)
    // 标题左侧空格子
    fillRowEmpty(0, startCol, row)
    col = startCol

    for (let i = 0; i < titleCharCount && idx < items.length; i++, idx++) {
      const ch = items[idx].char
      const x = marginLeft + col * cellSize
      const y = startY + row * cellSize

      drawMiZiGe(ctx, x, y, cellSize)

      const ratio = isChineseChar(ch) ? 0.6 : 0.45
      const charFontSize = cellSize * ratio
      ctx.font = `${charFontSize}px "KaiTi", "STKaiti", "楷体", serif`
      ctx.fillStyle = '#1a1a1a'
      ctx.fillText(ch, x + cellSize / 2, y + cellSize / 2)

      col++
    }

    // 标题行右侧空格子 + 强制换行
    fillRowEmpty(col, cols, row)
    col = 0
    row++

    // 标题与正文之间留一行间距
    // if (row < maxRows) {
    //   fillRowEmpty(0, cols, row)
    //   row++
    // }
  }

  // --- 绘制正文米字格 ---
  while (idx < items.length && row < maxRows) {
    const item = items[idx]
    const ch = item.char

    const x = marginLeft + col * cellSize
    const y = startY + row * cellSize

    drawMiZiGe(ctx, x, y, cellSize)

    const ratio = isChineseChar(ch) ? 0.6 : 0.45
    const charFontSize = cellSize * ratio
    ctx.font = `${charFontSize}px "KaiTi", "STKaiti", "楷体", serif`
    ctx.fillStyle = '#1a1a1a'
    ctx.fillText(ch, x + cellSize / 2, y + cellSize / 2)

    col++

    // 行末或强制换行：补齐本行剩余空格，再换行
    if (col >= cols || item.breakAfter) {
      if (col < cols) {
        fillRowEmpty(col, cols, row)
      }
      col = 0
      row++
    }

    idx++
  }

  // 所有内容消费完毕后，补齐页面剩余空格
  if (row < maxRows) {
    fillRowEmpty(col, cols, row)
    col = 0
    row++
    for (let r = row; r < maxRows; r++) {
      fillRowEmpty(0, cols, r)
    }
  }

  // --- 页码 ---
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.font = '12px var(--sans)'
  ctx.fillStyle = '#999999'
  ctx.fillText(`- ${pageNum} -`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 12)

  return { dataUrl: canvas.toDataURL('image/png'), nextIndex: idx }
}

/** 绘制单个米字格 */
function drawMiZiGe(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  const mid = size / 2

  // 外框
  ctx.strokeStyle = '#c0c0c0'
  ctx.lineWidth = 1
  ctx.setLineDash([])
  ctx.strokeRect(x, y, size, size)

  // 虚线：横竖中线
  ctx.strokeStyle = '#d8d8d8'
  ctx.lineWidth = 0.5
  ctx.setLineDash([4, 3])

  ctx.beginPath()
  ctx.moveTo(x, y + mid)
  ctx.lineTo(x + size, y + mid)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(x + mid, y)
  ctx.lineTo(x + mid, y + size)
  ctx.stroke()

  // 虚线：两条对角线
  ctx.strokeStyle = '#e8e8e8'
  ctx.setLineDash([3, 4])

  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + size, y + size)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(x + size, y)
  ctx.lineTo(x, y + size)
  ctx.stroke()

  ctx.setLineDash([])
}

/** 判断字符是否为汉字 */
function isChineseChar(ch: string): boolean {
  return /[一-鿿㐀-䶿]/.test(ch)
}

/** 根据用户输入生成图像（支持多页） */
function generateImage(): string[] {
  const text = userInput.value.trim()
  if (!text) return []

  const rawLines = text.split('\n').filter((l) => l.trim().length > 0)
  if (rawLines.length === 0) return []

  // 标题检测：第一行 ≤10 个字且有后续内容 → 居中放在米字格首行
  const TITLE_THRESHOLD = 10
  const titleCharCount =
    rawLines.length > 1 && rawLines[0].length <= TITLE_THRESHOLD
      ? rawLines[0].length
      : 0

  // 构建字符流（包含所有行），标记强制换行
  const items: CharItem[] = []
  for (const line of rawLines) {
    if (line.trim().length === 0) continue
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '\t') continue
      items.push({ char: line[i], breakAfter: false })
    }
    // 每行末尾标记强制换行
    if (items.length > 0) {
      items[items.length - 1].breakAfter = true
    }
  }

  if (items.length === 0) return []

  const pages: string[] = []
  let cursor = 0
  let pageIndex = 0

  while (cursor < items.length) {
    const { dataUrl, nextIndex } = renderPage(
      items,
      cursor,
      titleCharCount,
      pageIndex === 0,
      pageIndex + 1,
    )
    pages.push(dataUrl)
    if (nextIndex <= cursor) break
    cursor = nextIndex
    pageIndex++
  }

  return pages
}

function doGenerate() {
  imageUrls.value = generateImage()
}

function handlePrint() {
  if (imageUrls.value.length === 0) return

  const printWindow = window.open('', '_blank', 'width=800,height=600')
  if (!printWindow) return

  const doc = printWindow.document

  // 构建文档结构
  doc.title = '习字帖'

  const style = doc.createElement('style')
  style.textContent = `
    @page { size: A4; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    .page { width: 210mm; height: 297mm; overflow: hidden; break-after: page; }
    .page:last-of-type { break-after: auto; }
    .page img { display: block; width: 100%; height: 100%; object-fit: contain; }
  `
  doc.head.appendChild(style)

  imageUrls.value.forEach((url) => {
    const page = doc.createElement('div')
    page.className = 'page'
    const img = doc.createElement('img')
    img.src = url
    page.appendChild(img)
    doc.body.appendChild(page)
  })

  // 确保只打印一次（onload 与 setTimeout 互斥）
  let printed = false
  const doPrint = () => {
    if (printed) return
    printed = true
    printWindow.print()
  }

  const timer = setTimeout(doPrint, 500)

  const lastPage = doc.body.lastElementChild
  const lastImg = lastPage?.querySelector('img') as HTMLImageElement | null
  if (lastImg) {
    if (lastImg.complete) {
      // 图片已缓存/同步加载完成
      clearTimeout(timer)
      doPrint()
    } else {
      lastImg.onload = () => {
        clearTimeout(timer)
        doPrint()
      }
    }
  }
}

// 输入变化时防抖自动生成
watch(userInput, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    doGenerate()
  }, 300)
})

// 文字大小改变时立即重新生成
watch(fontSize, () => {
  if (userInput.value.trim()) {
    imageUrls.value = generateImage()
  }
})
</script>

<template>
  <div class="edu-word">
    <header class="edu-word__header">
      <h1>习字帖</h1>
    </header>

    <div class="edu-word__input-area">
      <textarea
        v-model="userInput"
        class="edu-word__text-input"
        placeholder="请输入文字内容"
        rows="5"
      ></textarea>
    </div>

    <!-- 文字大小滑块 -->
    <div class="edu-word__slider">
      <label class="edu-word__slider-label">
        文字大小
        <span class="edu-word__slider-value">{{ fontSize }}px</span>
      </label>
      <input
        type="range"
        class="edu-word__slider-input"
        v-model.number="fontSize"
        min="20"
        max="80"
        step="2"
      />
      <div class="edu-word__slider-marks">
        <span>20</span>
        <span>80</span>
      </div>
    </div>

    <!-- 输出区域 -->
    <section class="edu-word__output-area">
      <div v-if="imageUrls.length > 0" class="edu-word__toolbar">
        <button class="edu-word__print-btn" @click="handlePrint">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <path d="M6 14h12v8H6z" />
          </svg>
          打印
        </button>
      </div>
      <div v-if="imageUrls.length > 0" class="edu-word__pages">
        <article
          v-for="(url, i) in imageUrls"
          :key="i"
          class="edu-word__page"
        >
          <span class="edu-word__page-label">第 {{ i + 1 }} 页</span>
          <img :src="url" alt="第 {{ i + 1 }} 页" class="edu-word__image" />
        </article>
      </div>

      <div v-else class="edu-word__placeholder">
        <svg
          class="edu-word__placeholder-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
        <p>生成的图像将显示在这里</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.edu-word {
  padding: 40px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.edu-word__header {
  text-align: center;
}

.edu-word__header h1 {
  margin-bottom: 8px;
}

.edu-word__header p {
  color: var(--text);
  margin: 0;
}

/* ---- 输入区域 ---- */
.edu-word__input-area {
  display: flex;
  gap: 12px;
  width: 100%;
  max-width: 640px;
}

.edu-word__text-input {
  flex: 1;
  padding: 12px 16px;
  font-size: 16px;
  font-family: var(--sans);
  color: var(--text-h);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s;
  resize: vertical;
  min-height: 120px;
}

.edu-word__text-input:focus {
  border-color: var(--accent);
}

/* ---- 文字大小滑块 ---- */
.edu-word__slider {
  width: 100%;
  max-width: 640px;
}

.edu-word__slider-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-h);
  margin-bottom: 8px;
}

.edu-word__slider-value {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--accent);
  background: var(--accent-bg);
  padding: 2px 10px;
  border-radius: 4px;
}

.edu-word__slider-input {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.edu-word__slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.edu-word__slider-input::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.edu-word__slider-marks {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text);
  margin-top: 4px;
}

/* ---- 输出区域 ---- */
.edu-word__output-area {
  width: 100%;
  max-width: 640px;
  min-height: 360px;
  border: 2px dashed var(--border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #fafafa;
}

@media (prefers-color-scheme: dark) {
  .edu-word__output-area {
    background: #1a1a20;
  }
}

.edu-word__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text);
  opacity: 0.6;
  padding: 40px;
}

.edu-word__placeholder-icon {
  width: 48px;
  height: 48px;
}

/* ---- 打印按钮 ---- */
.edu-word__toolbar {
  width: 100%;
  padding: 12px 20px 0;
  box-sizing: border-box;
  display: flex;
  justify-content: flex-end;
}

.edu-word__print-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  font-size: 14px;
  font-family: var(--sans);
  font-weight: 500;
  color: var(--accent);
  background: var(--accent-bg);
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.edu-word__print-btn:hover {
  border-color: var(--accent-border);
}

/* ---- 多页结果 ---- */
.edu-word__pages {
  width: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.edu-word__page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.edu-word__page-label {
  font-size: 13px;
  font-family: var(--mono);
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 3px 14px;
}

.edu-word__image {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
</style>
