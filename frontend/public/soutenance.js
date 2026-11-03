const slides = [...document.querySelectorAll('.slide')]
let i = Math.max(0, Math.min(slides.length - 1, Number(location.hash.slice(1)) - 1 || 0))

function animateScore(slide) {
  const target = 84
  slide.querySelector('#ring').style.strokeDashoffset = 440 - (440 * target) / 100
  slide.querySelectorAll('.f').forEach((f) => (f.style.width = f.dataset.w + '%'))
  const num = slide.querySelector('#num')
  const start = performance.now()
  const tick = (t) => {
    const p = Math.min(1, (t - start - 300) / 1600)
    num.textContent = Math.round(target * Math.max(0, p))
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function show(n) {
  i = Math.max(0, Math.min(slides.length - 1, n))
  slides.forEach((s, k) => {
    s.classList.toggle('active', k === i)
    s.classList.toggle('past', k < i)
    s.setAttribute('aria-hidden', k !== i)
  })
  const s = slides[i]
  if (s.hasAttribute('data-score')) animateScore(s)
  document.getElementById('progress').style.width = ((i + 1) / slides.length) * 100 + '%'
  document.getElementById('count').textContent = `${i + 1} / ${slides.length}`
  history.replaceState(null, '', '#' + (i + 1))
}

document.addEventListener('keydown', (e) => {
  if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); show(i + 1) }
  if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); show(i - 1) }
  if (e.key === 'Home') show(0)
  if (e.key === 'End') show(slides.length - 1)
  if (e.key === 'f') document.documentElement.requestFullscreen?.()
})
document.getElementById('next').onclick = () => show(i + 1)
document.getElementById('prev').onclick = () => show(i - 1)
document.getElementById('theme').onclick = () => {
  const root = document.documentElement
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'
}
let x0 = null
addEventListener('touchstart', (e) => (x0 = e.touches[0].clientX))
addEventListener('touchend', (e) => {
  if (x0 === null) return
  const dx = e.changedTouches[0].clientX - x0
  if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1))
  x0 = null
})
show(i)
