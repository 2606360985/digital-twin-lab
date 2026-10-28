import { computed,ref,watch } from 'vue'
import { defineStore } from 'pinia'
import { fullAutomaticScore,fullBasis,parseFull,stageReady,type FullSaved } from './fullCourseDomain'
import { usePortal } from './portal'
export const FULL_PORTAL_KEY='twin-workshop:full-course-submissions:v1'
export interface FullReview { reviewer:string;needs:number;architecture:number;feedback:string;recordIds:number[];at:string }
export interface FullSubmission { id:number;stage:1;basis:string;submittedAt:string;snapshotJson:string;reviews:FullReview[] }
const validScore=(x:unknown)=>Number.isInteger(x)&&Number(x)>=0&&Number(x)<=5
function validReview(r:FullReview,s:FullSaved){return r&&typeof r.reviewer==='string'&&!!r.reviewer.trim()&&r.reviewer.length<=10000&&validScore(r.needs)&&validScore(r.architecture)&&typeof r.feedback==='string'&&!!r.feedback.trim()&&r.feedback.length<=10000&&typeof r.at==='string'&&Number.isFinite(Date.parse(r.at))&&Array.isArray(r.recordIds)&&r.recordIds.length>0&&r.recordIds.every(id=>s.records.some(e=>e.id===id))}
export function parseFullPortal(text:string):FullSubmission[]{
 if(text.length>24_000_000)throw Error('批阅备份不能超过24 MB。')
 const data=JSON.parse(text);if(data.version!==1||data.courseId!=='full-course'||!Array.isArray(data.submissions)||data.submissions.length>30)throw Error('批阅版本不合法。')
 const ids=new Set<number>()
 return data.submissions.map((r:FullSubmission)=>{const s=parseFull(r.snapshotJson);if(!Number.isInteger(r.id)||r.id<1||ids.has(r.id)||r.stage!==1||r.basis!==fullBasis(s)||!stageReady(s)||!Number.isFinite(Date.parse(r.submittedAt))||!Array.isArray(r.reviews)||r.reviews.length>100||!r.reviews.every(v=>validReview(v,s)))throw Error('提交快照或评分不合法。');ids.add(r.id);return {id:r.id,stage:1,basis:r.basis,submittedAt:r.submittedAt,snapshotJson:JSON.stringify(s),reviews:r.reviews}})
}
export const useFullPortal=defineStore('full-course-portal',()=>{
 const submissions=ref<FullSubmission[]>([]),error=ref(''),message=ref(''),originalUnreadable=ref(''),healthy=ref(true)
 try{const raw=localStorage.getItem(FULL_PORTAL_KEY);if(raw){originalUnreadable.value=raw;submissions.value=parseFullPortal(raw);originalUnreadable.value=''}}catch{healthy.value=false;error.value='完整课程批阅存档读取失败，原始内容已保留。请导出诊断或导入有效批阅备份。'}
 watch(submissions,()=>{if(!healthy.value)return;try{localStorage.setItem(FULL_PORTAL_KEY,exportJson());error.value=''}catch{error.value='批阅存档保存失败，请导出备份。'}},{deep:true,flush:'post'})
 function submit(s:FullSaved){if(!healthy.value){message.value='请先恢复有效的批阅存档，再提交。';return null}if(!stageReady(s)){message.value='步骤1—7须完成必要成果和验证后才能提交，无需取得教师满分。';return null}const basis=fullBasis(s),existing=submissions.value.find(r=>r.basis===basis);if(existing){message.value='当前版本已经提交。';return existing}if(submissions.value.length>=30){message.value='已达到30个提交版本，请先导出批阅备份。';return null}const r:FullSubmission={id:(submissions.value.at(-1)?.id??0)+1,stage:1,basis,submittedAt:new Date().toISOString(),snapshotJson:JSON.stringify(s),reviews:[]};submissions.value.push(r);message.value=`第一阶段提交V${r.id}已冻结，等待教师批阅。`;return r}
 function grade(id:number,input:Omit<FullReview,'at'>){const r=submissions.value.find(r=>r.id===id);if(usePortal().role!=='teacher'||!r){message.value='请在教师端选择一个已提交版本。';return false}const s=parseFull(r.snapshotJson),review={...input,at:new Date().toISOString()};if(!validReview(review,s)){message.value='请填写教师、0—5整数分、引用记录和反馈。';return false}if(r.reviews.length>=100){message.value='本版本已达到批阅记录上限。';return false}r.reviews.push(review);message.value=`已保存提交V${id}的批阅。`;return true}
 function current(s:FullSaved){return submissions.value.find(r=>r.basis===fullBasis(s))}
 function exportJson(){return JSON.stringify({version:1,courseId:'full-course',submissions:submissions.value},null,2)}
 function importJson(text:string){try{const parsed=parseFullPortal(text);submissions.value=parsed;healthy.value=true;originalUnreadable.value='';error.value='';message.value='完整课程提交与批阅备份已恢复。';return true}catch{message.value='批阅备份校验失败，原始列表未改变。';return false}}
 const pending=computed(()=>submissions.value.filter(r=>!r.reviews.length))
 function score(s:FullSaved){const r=current(s)?.reviews.at(-1);return fullAutomaticScore(s)+(r?r.needs+r.architecture:0)}
 return {submissions,error,message,originalUnreadable,pending,submit,grade,current,score,exportJson,importJson}
})
