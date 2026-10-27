import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { clone, achievements, coreCorrect, signature } from './domain'
import { parseSnapshot, reportBasis, isCurrentTrial, type LabSession, type Review, type SavedState } from './store'
export const PORTAL_KEY = 'twin-workshop:teacher-submissions:v1'
export const ROLE_KEY = 'twin-workshop:role-demo:v1'
export interface SubmissionSnapshot { id: number; version: number; basis: string; submittedAt: string; origin: '本地提交' | 'v2历史迁入'; snapshotJson: string; reviews: Review[] }
export type ReviewInput = Omit<Review, 'basis' | 'at'>
function validReview(input: ReviewInput, s: SavedState) { return typeof input.reviewer==='string' && !!input.reviewer.trim() && input.reviewer.length<=20000 && typeof input.feedback==='string' && !!input.feedback.trim() && input.feedback.length<=20000 && Number.isInteger(input.explanation) && input.explanation>=0 && input.explanation<=20 && Number.isInteger(input.limits) && input.limits>=0 && input.limits<=10 && Array.isArray(input.trialIds) && input.trialIds.length>0 && input.trialIds.every(id=>s.trials.some(t=>t.id===id&&t.complete)) }
export const usePortal = defineStore('teacher-portal', () => {
  const role = ref<'student' | 'teacher'>('student'), submissions = ref<SubmissionSnapshot[]>([]), error = ref(''), message = ref('')
  try {
    const r = localStorage.getItem(ROLE_KEY); if (r === 'teacher' || r === 'student') role.value = r
    const text = localStorage.getItem(PORTAL_KEY)
    if (text) {
      const archive = JSON.parse(text)
      if (archive.version !== 1 || !Array.isArray(archive.submissions)) throw 0
      const ids = new Set<number>()
      submissions.value = archive.submissions.map((r: SubmissionSnapshot) => {
        const s = parseSnapshot(r.snapshotJson)
        if (!Number.isInteger(r.id) || r.id<1 || ids.has(r.id) || !Number.isInteger(r.version) || r.version<1 || r.basis!==reportBasis(s) || s.submission!==r.basis || typeof r.submittedAt!=='string' || !['本地提交','v2历史迁入'].includes(r.origin) || !Array.isArray(r.reviews) || !r.reviews.every(review=>validReview(review,s)&&review.basis===r.basis&&typeof review.at==='string')) throw 0
        ids.add(r.id); return clone(r)
      })
    }
  } catch { error.value = '本地批阅列表读取失败，原始存档未清除。可先导出备份。' }
  watch(role, value => { try { localStorage.setItem(ROLE_KEY,value) } catch { error.value='角色演示状态无法保存。' } })
  watch(submissions, value => { try { localStorage.setItem(PORTAL_KEY,JSON.stringify({version:1,submissions:value})); error.value='' } catch { error.value='本地批阅列表无法保存，请导出批阅备份。' } }, {deep:true,flush:'post'})
  const pending = computed(()=>submissions.value.filter(r=>!r.reviews.length))
  const reviewed = computed(()=>submissions.value.filter(r=>r.reviews.length))
  function setRole(value:'student'|'teacher') { role.value=value }
  function capture(s:SavedState, origin:SubmissionSnapshot['origin']='本地提交') {
    const basis=reportBasis(s), existing=submissions.value.find(r=>r.basis===basis)
    if(existing) return existing
    if(s.submission!==basis || achievements(s.trials,s.config,s.transferId).reduce((n,r)=>n+r.earned,0)!==70 || !s.trials.some(t=>isCurrentTrial(t,s)) || !Object.values(s.conclusions).every(v=>v.trim())) return null
    const oldReview = s.review?.basis===basis && validReview(s.review,s) ? [clone(s.review)] : []
    const entry:SubmissionSnapshot={id:(submissions.value.at(-1)?.id??0)+1,version:submissions.value.length+1,basis,submittedAt:new Date().toISOString(),origin,snapshotJson:JSON.stringify(clone(s)),reviews:oldReview}
    submissions.value.push(entry); return entry
  }
  function snapshot(id:number):SavedState|null { const entry=submissions.value.find(r=>r.id===id); return entry?JSON.parse(entry.snapshotJson):null }
  function grade(id:number,input:ReviewInput) {
    const entry=submissions.value.find(r=>r.id===id), s=snapshot(id)
    if(role.value!=='teacher' || !entry || !s || !validReview(input,s)) { message.value='请在教师端选择已提交版本，填写姓名、有效整数分、完整记录编号及反馈。'; return false }
    entry.reviews.push({...clone(input),basis:entry.basis,at:new Date().toISOString()}); message.value=`已批阅提交版本V${entry.version}。评分只关联这一版本。`; return true
  }
  function syncCurrent(lab:LabSession, origin:SubmissionSnapshot['origin']='本地提交') {
    if(!lab.submitted) return
    const entry=capture(lab.saved,origin), review=entry?.reviews.at(-1)
    if(review && JSON.stringify(lab.saved.review)!==JSON.stringify(review)) lab.saved.review=clone(review)
  }
  function exportJson() { return JSON.stringify({version:1,submissions:submissions.value},null,2) }
  return {role,submissions,error,message,pending,reviewed,setRole,capture,snapshot,grade,syncCurrent,exportJson}
})
