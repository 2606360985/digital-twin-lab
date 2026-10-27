import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { DATASET, WINDOW, achievements, advanceTrial, assetReading, clone, coreCorrect, equipmentIds, initialConfig, metrics, modelReading, newTrial, pointError, ruleError, signature, type Equipment, type LabConfig, type PredictionEdit, type Trial, type TrialKind } from './domain'
export const STORAGE_KEY = 'twin-workshop:monitoring-cell:v2'
export const LEGACY_KEY = 'twin-workshop:monitoring-cell:v1'
export interface Review { reviewer: string; explanation: number; limits: number; feedback: string; trialIds: number[]; basis: string; at: string }
export interface SavedState {
  version: 2; scenarioId: 'pump-core'; config: LabConfig; trials: Trial[]; activeId: number | null; phase: number; kind: TrialKind;
  predictions: Record<TrialKind, string>; predictionHistory: Record<TrialKind, PredictionEdit[]>;
  conclusions: { mapping: string; period: string; strategy: string; transfer: string; limits: string };
  logs: { at: string; text: string; before?: LabConfig; after?: LabConfig }[];
  transferId: number | null; submission: string; review: Review | null; sceneSelections: Equipment[]
}
export function fresh(): SavedState { return { version: 2, scenarioId: 'pump-core', config: initialConfig(), trials: [], activeId: null, phase: 0, kind: 'mapping', predictions: { mapping: '', period: '', strategy: '', transfer: '' }, predictionHistory: { mapping: [], period: [], strategy: [], transfer: [] }, conclusions: { mapping: '', period: '', strategy: '', transfer: '', limits: '' }, logs: [], transferId: null, submission: '', review: null, sceneSelections: [] } }
const isText = (x: unknown): x is string => typeof x === 'string' && x.length <= 20000
const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const nullableTime = (x: unknown) => x === null || (Number.isInteger(x) && Number(x) >= 0 && Number(x) <= WINDOW)
const isId = (x: unknown): x is Equipment => equipmentIds.includes(x as Equipment)
const kinds: TrialKind[] = ['mapping', 'period', 'strategy', 'transfer']
// A compact change fingerprint, not a security signature or authentication token.
export function fingerprint(text: string): string {
  let a = 2166136261, b = 5381
  for (let i = 0; i < text.length; i++) { a = Math.imul(a ^ text.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ text.charCodeAt(i) }
  return `${text.length}:${a >>> 0}:${b >>> 0}`
}
function assertConfig(c: LabConfig) {
  if (!c || !Array.isArray(c.assets) || c.assets.length !== 3 || new Set(c.assets.map(a => a.id)).size !== 3 || !c.assets.every(a => isId(a.id) && isText(a.code) && isText(a.name))) throw 0
  if (!c.bindings || !equipmentIds.every(id => c.bindings[id] === '' || isId(c.bindings[id])) || ![1, 3].includes(c.period) || !['threshold', 'persistence', 'hysteresis'].includes(c.strategy)) throw 0
  if (!c.point || !['', 'motor_i', 'tank_level', 'outlet_temp'].includes(c.point.field) || !['number', 'string'].includes(c.point.type) || !['A', 'mA', '%', '℃'].includes(c.point.unit) || ![c.point.min, c.point.max].every(num)) throw 0
  if (!c.rule || ![c.rule.high, c.rule.low, c.rule.duration, c.rule.recoveryDuration].every(num)) throw 0
}
export function parseSnapshot(text: string): SavedState {
  if (text.length > 20_000_000) throw new Error('备份不能超过20 MB。')
  try {
    const s = JSON.parse(text) as SavedState
    if (!s || s.version !== 2 || s.scenarioId !== 'pump-core') throw 0
    assertConfig(s.config)
    if (!Array.isArray(s.trials) || s.trials.length > 1000 || !Number.isInteger(s.phase) || s.phase < 0 || s.phase > 4 || !kinds.includes(s.kind) || !(s.activeId === null || Number.isInteger(s.activeId))) throw 0
    if (!(s.transferId === null || Number.isInteger(s.transferId)) || !s.predictions || !s.predictionHistory || !s.conclusions || !kinds.every(k => isText(s.predictions[k]) && isText(s.conclusions[k]) && Array.isArray(s.predictionHistory[k]) && s.predictionHistory[k].every(e => isText(e.text) && isText(e.at))) || !isText(s.conclusions.limits)) throw 0
    if (!Array.isArray(s.logs) || !s.logs.every(e => isText(e.at) && isText(e.text)) || !Array.isArray(s.sceneSelections) || !s.sceneSelections.every(isId) || !isText(s.submission)) throw 0
    const ids = new Set<number>()
    s.trials = s.trials.map(t => {
      assertConfig(t.config)
      if (!Number.isInteger(t.id) || t.id < 1 || ids.has(t.id) || !kinds.includes(t.kind) || t.dataset !== DATASET || !Number.isInteger(t.tick) || t.tick < 0 || t.tick > WINDOW || !isText(t.prediction) || !isText(t.startedAt) || !(t.transferId === null || Number.isInteger(t.transferId)) || !Array.isArray(t.predictionHistory) || !t.predictionHistory.every(e => isText(e.text) && isText(e.at))) throw 0
      ids.add(t.id)
      if (!Array.isArray(t.observations) || !t.observations.every(o => Number.isInteger(o.tick) && o.tick >= 1 && o.tick <= t.tick && isId(o.model) && isText(o.note))) throw 0
      const rebuilt = newTrial(t.id, t.kind, t.config, t.prediction, t.predictionHistory, t.transferId); rebuilt.startedAt = t.startedAt
      for (let n = 0; n < t.tick; n++) advanceTrial(rebuilt)
      // Source data, detector output and metrics are always regenerated, never trusted from a file.
      rebuilt.observations = t.observations.map(o => {
        const published = rebuilt.published.filter(s => s.tick <= o.tick).at(-1)
        const reading = modelReading(t.config, o.model, published)
        const source = modelReading(t.config, o.model, rebuilt.samples[o.tick - 1])
        return { tick: o.tick, displayTick: published?.tick ?? null, sourceValue: source.reading?.value ?? null, model: o.model, asset: reading.asset?.id ?? '', code: reading.asset?.code ?? '', field: reading.reading?.field ?? '', unit: reading.reading?.unit ?? '', value: reading.reading?.value ?? null, quality: reading.reading?.quality ?? '无数据', note: o.note }
      })
      if (!Array.isArray(t.incidents) || t.incidents.length !== rebuilt.incidents.length) throw 0
      rebuilt.incidents.forEach((e, i) => { const old = t.incidents[i]!; if (old.id !== e.id || old.triggeredAt !== e.triggeredAt || old.recoveredAt !== e.recoveredAt || !nullableTime(old.acknowledgedAt) || !nullableTime(old.closedAt)) throw 0; if (old.acknowledgedAt !== null && (old.acknowledgedAt < e.triggeredAt || old.acknowledgedAt > t.tick)) throw 0; if (old.closedAt !== null && (old.acknowledgedAt === null || e.recoveredAt === null || old.closedAt < Math.max(old.acknowledgedAt, e.recoveredAt) || old.closedAt > t.tick)) throw 0; e.acknowledgedAt = old.acknowledgedAt; e.closedAt = old.closedAt })
      return rebuilt
    })
    if (s.activeId !== null && !ids.has(s.activeId)) throw 0
    if (s.review && (!isText(s.review.reviewer) || !isText(s.review.feedback) || !isText(s.review.basis) || !isText(s.review.at) || !Number.isInteger(s.review.explanation) || s.review.explanation < 0 || s.review.explanation > 20 || !Number.isInteger(s.review.limits) || s.review.limits < 0 || s.review.limits > 10 || !Array.isArray(s.review.trialIds) || !s.review.trialIds.every(id => ids.has(id)))) throw 0
    const clean = Object.fromEntries(Object.keys(fresh()).map(k => [k, s[k as keyof SavedState]])) as unknown as SavedState
    return clone(clean)
  } catch { throw new Error('备份结构、版本或事件记录不符合本实验，当前进度未改变。') }
}
export function parseLegacy(text: string) {
  if (text.length > 20_000_000) throw new Error('旧备份过大。')
  try { const s = JSON.parse(text); if (s?.version !== 1 || s.scenarioId !== 'monitoring-cell' || !Array.isArray(s.config?.assets) || !s.config.assets.every((a: Record<string, unknown>) => isText(a.code) && isText(a.name)) || !Array.isArray(s.events)) throw 0; return { version: 1, assets: s.config.assets.map((a: Record<string, string>) => ({ code: a.code, name: a.name })), events: s.events.filter((e: Record<string, unknown>) => isText(e.text)).map((e: Record<string, unknown>) => ({ tick: e.tick, text: e.text })), reflection: isText(s.reflection) ? s.reflection : '', raw: text } } catch { throw new Error('无法读取此v1备份。') }
}
export const TUTORIAL_KEY = 'twin-workshop:tutorial:v1'
export function defineLabSession(id: string, storageKey: string, readLegacy = false) { return defineStore(id, () => {
  const saved = ref(fresh()), persistenceError = ref(''), lastMessage = ref('')
  const legacy = ref<ReturnType<typeof parseLegacy> | null>(null)
  try { const text = localStorage.getItem(storageKey); if (text) saved.value = parseSnapshot(text); const old = readLegacy ? localStorage.getItem(LEGACY_KEY) : null; if (old) legacy.value = parseLegacy(old) } catch { persistenceError.value = '本地记录读取失败。原始存储未被清除，请导入备份或导出诊断。' }
  const running = ref(false), sceneReady = ref(false), selected = ref<Equipment>('pump'), sceneSelected = ref<Equipment>('pump'), page = ref<'overview' | 'lab' | 'report'>('overview')
  let timer: ReturnType<typeof setInterval> | undefined
  let previousConfig = clone(saved.value.config)
  const active = computed(() => saved.value.trials.find(t => t.id === saved.value.activeId) ?? null)
  const latest = computed(() => active.value?.published.at(-1))
  const currentMatches = computed(() => !!active.value && signature(active.value.config) === signature(saved.value.config))
  const currentAccepted = computed(() => saved.value.trials.some(t => t.complete && signature(t.config) === signature(saved.value.config) && coreCorrect(t.config) && t.observations.length > 0))
  const results = computed(() => achievements(saved.value.trials, saved.value.config, saved.value.transferId))
  const autoScore = computed(() => results.value.reduce((n, r) => n + r.earned, 0))
  const basis = computed(() => reportBasis(saved.value))
  const submitted = computed(() => saved.value.submission === basis.value)
  const reviewValid = computed(() => submitted.value && saved.value.review?.basis === basis.value)
  const teacherScore = computed(() => reviewValid.value ? saved.value.review!.explanation + saved.value.review!.limits : 0)
  const totalScore = computed(() => autoScore.value + teacherScore.value)
  watch(saved, () => { try { assertConfig(saved.value.config); localStorage.setItem(storageKey, JSON.stringify(saved.value)); persistenceError.value = '' } catch { persistenceError.value = '配置包含无效数字或本地保存失败；上次有效存档未清除。请修正输入并导出备份。' } }, { deep: true, flush: 'post' })
  function log(text: string, before?: LabConfig, after?: LabConfig) { saved.value.logs.push({ at: new Date().toISOString(), text, ...(before ? { before: clone(before) } : {}), ...(after ? { after: clone(after) } : {}) }) }
  function pause() { running.value = false; if (timer) clearInterval(timer); timer = undefined }
  function changed() { pause(); log('配置变更；历史试验保留，当前方案须另行回放验证。', previousConfig, saved.value.config); previousConfig = clone(saved.value.config); const bound = saved.value.config.bindings[sceneSelected.value]; if (bound) selected.value = bound; lastMessage.value = '配置已改变。旧试验仍可比较，不能作为当前配置的验收。' }
  function setPhase(index: number) { pause(); saved.value.phase = index; saved.value.kind = index <= 1 ? 'mapping' : index === 2 ? 'period' : index === 3 ? 'strategy' : 'transfer' }
  function editPrediction(text: string) { const k = saved.value.kind; saved.value.predictions[k] = text; saved.value.predictionHistory[k].push({ text, at: new Date().toISOString() }) }
  function choose(id: Equipment, source: 'tree' | 'scene') {
    if (source === 'scene') { sceneSelected.value = id; if (!saved.value.sceneSelections.includes(id)) saved.value.sceneSelections.push(id); const bound = saved.value.config.bindings[id]; if (bound) selected.value = bound }
    else { selected.value = id; const model = equipmentIds.find(m => saved.value.config.bindings[m] === id); if (model) sceneSelected.value = model }
  }
  function startTrial() {
    pause(); const s = saved.value, prediction = s.predictions[s.kind].trim()
    try { assertConfig(s.config) } catch { lastMessage.value = '配置包含空白或无效数字，请修正后再运行。'; return false }
    if (s.trials.length >= 1000) { lastMessage.value = '已达到1000次试验的本地上限，请先导出备份。'; return false }
    if (!prediction) { lastMessage.value = '先填写并保存本实验预测，再开始回放。预测内容由教师评价，不自动判定理解程度。'; return false }
    if (ruleError(s.config)) { lastMessage.value = ruleError(s.config); return false }
    if (s.kind === 'transfer' && s.transferId === null) { lastMessage.value = '请先领取独立迁移任务。'; return false }
    const t = newTrial((s.trials.at(-1)?.id ?? 0) + 1, s.kind, s.config, prediction, s.predictionHistory[s.kind], s.kind === 'transfer' ? s.transferId : null)
    s.trials.push(t); s.activeId = t.id; log(`仿真记录#${t.id}开始，输入窗口1—40秒，配置和预测已锁定。`); lastMessage.value = '已开始新一轮仿真。配置和预测已锁定，可暂停、单步或快速完成。'; play(); return true
  }
  function step() { const t = active.value; if (!t || t.complete || !currentMatches.value) { pause(); return }; advanceTrial(t); if (t.complete) { pause(); log(`仿真记录#${t.id}完成。`); lastMessage.value = '回放完成，请点选三维泵，记录关联链和观察。' } }
  const controlHistory = ref<string[]>([])
  function control(action: 'pause' | 'resume' | 'step' | 'finish') {
    controlHistory.value.push(action)
    if (action === 'pause') pause(); else if (action === 'resume') play(); else if (action === 'step') { pause(); step() } else finish()
  }
  function play() { if (!active.value || active.value.complete || !currentMatches.value) return; pause(); running.value = true; timer = setInterval(step, 1000) }
  function finish() { pause(); if (!currentMatches.value) { lastMessage.value = '配置已改变，请开始新一轮仿真。'; return }; while (active.value && !active.value.complete) step() }
  function selectTrial(id: number) { pause(); saved.value.activeId = id }
  function repeatTrial(id: number) { const t = saved.value.trials.find(t => t.id === id); if (!t) return; pause(); saved.value.config = clone(t.config); previousConfig = clone(t.config); saved.value.kind = t.kind; editPrediction(t.prediction); startTrial() }
  function reading(id: Equipment) { return assetReading(saved.value.config, id, latest.value) }
  function modelInfo(id: Equipment) { return modelReading(saved.value.config, id, latest.value) }
  function modelActive(id: Equipment) { return currentMatches.value && saved.value.config.bindings[id] === 'pump' && !pointError(saved.value.config) && !!active.value?.detector.active }
  function observe(note: string) {
    const t = active.value
    if (!t || !t.tick || !currentMatches.value) { lastMessage.value = '请先运行与当前配置一致的试验。'; return false }
    if (!sceneReady.value || !saved.value.sceneSelections.includes(sceneSelected.value)) { lastMessage.value = '请实际点击三维模型后记录关联链。'; return false }
    if (!note.trim()) { lastMessage.value = '请填写观察内容。文字仅检查完整性，由教师判断解释是否有据。'; return false }
    const info = modelReading(t.config, sceneSelected.value, t.published.at(-1))
    const source = modelReading(t.config, sceneSelected.value, t.samples[t.tick - 1])
    t.observations.push({ tick: t.tick, displayTick: t.published.at(-1)?.tick ?? null, sourceValue: source.reading?.value ?? null, model: sceneSelected.value, asset: info.asset?.id ?? '', code: info.asset?.code ?? '', field: info.reading?.field ?? '', unit: info.reading?.unit ?? '', value: info.reading?.value ?? null, quality: info.reading?.quality ?? '无数据', note: note.trim() }); lastMessage.value = `已记录仿真记录#${t.id}的模型、资产、字段、源单位、源/发布读数和观察。`; return true
  }
  function acknowledge(id: number) { const t = active.value, e = t?.incidents.find(e => e.id === id); if (t && e && e.acknowledgedAt === null) { e.acknowledgedAt = t.tick; log(`仿真记录#${t.id}事件${id}已确认。`) } }
  function closeIncident(id: number) { const t = active.value, e = t?.incidents.find(e => e.id === id); if (!t || !e) return false; if (e.recoveredAt === null || e.acknowledgedAt === null) { lastMessage.value = '须先确认且满足恢复条件，才能关闭此事件。'; return false }; if (e.closedAt === null) { e.closedAt = t.tick; log(`仿真记录#${t.id}事件${id}复核关闭。`) }; return true }
  function assignTransfer() {
    pause(); const s = saved.value; s.transferId = (s.transferId ?? 0) + 1
    const c = initialConfig(); c.assets.forEach(a => { a.code = ({ tank: 'T-201', pump: 'P-207', exchanger: 'HX-209' })[a.id] }); c.bindings = { tank: 'tank', pump: 'exchanger', exchanger: 'exchanger' }; c.point.field = 'tank_level'; s.config = c; previousConfig = clone(c); s.kind = 'transfer'; s.phase = 4; log(`领取迁移任务${s.transferId}，新资产台账及待排查配置已建立。`); lastMessage.value = '请保留新台账，独立排查关联链和数据字典；修复后新建迁移试验。'
  }
  function submit() { if (autoScore.value < 70 || !currentAccepted.value || !Object.values(saved.value.conclusions).every(v => v.trim())) { lastMessage.value = '需完成70分实验数据证据、当前配置验收及五项结论，再提交教师复核。'; return false }; saved.value.submission = basis.value; log('实验报告已提交教师复核。'); lastMessage.value = '已提交。30分论证评价等待教师记录，不自动按字数给分。'; return true }
  function review(input: Omit<Review, 'basis' | 'at'>) {
    if (!submitted.value || !input.reviewer.trim() || !input.feedback.trim() || !Number.isInteger(input.explanation) || input.explanation < 0 || input.explanation > 20 || !Number.isInteger(input.limits) || input.limits < 0 || input.limits > 10 || !input.trialIds.length || !input.trialIds.every(id => saved.value.trials.some(t => t.id === id && t.complete))) { lastMessage.value = '先提交有效报告。教师复核须包含姓名、证据试验、反馈及合法整数分值。'; return false }
    saved.value.review = { ...clone(input), basis: basis.value, at: new Date().toISOString() }; log('已记录本地教师评价，非身份认证成绩。'); return true
  }
  function restore(text: string) { const s = parseSnapshot(text); pause(); saved.value = s; previousConfig = clone(s.config); lastMessage.value = 'v2备份已恢复，回放暂停；计算结果已按固定输入重新核算。' }
  function importArchive(text: string) { let version: unknown; try { version = JSON.parse(text)?.version } catch { throw new Error('文件不是有效JSON。') }; if (version === 1) { legacy.value = parseLegacy(text); lastMessage.value = 'v1备份已打开为只读，未导入配置或成绩。' } else restore(text) }
  function exportJson() { return JSON.stringify(saved.value, null, 2) }
  return { basis, controlHistory, control, saved, legacy, running, sceneReady, selected, sceneSelected, page, persistenceError, lastMessage, active, latest, currentMatches, currentAccepted, results, autoScore, submitted, reviewValid, teacherScore, totalScore, pause, play, step, finish, changed, setPhase, editPrediction, choose, startTrial, selectTrial, repeatTrial, reading, modelInfo, modelActive, observe, acknowledge, closeIncident, assignTransfer, submit, review, restore, importArchive, exportJson }
}) }


export const useLab = defineLabSession('lab', STORAGE_KEY, true)
export const useTutorialLab = defineLabSession('tutorial-lab', TUTORIAL_KEY)
export type LabSession = ReturnType<typeof useLab>
export function reportBasis(s: SavedState): string { return fingerprint(JSON.stringify({config:s.config,trials:s.trials,conclusions:s.conclusions,transferId:s.transferId})) }
