<script setup lang="ts">
import { computed,ref,nextTick,onMounted,onBeforeUnmount } from 'vue'
import { useFullCourse } from '../fullCourseStore'
import { useFullPortal } from '../fullCoursePortal'
import { fullStages,fullSteps,fullRubric } from '../fullCurriculum'
import { fullJson } from '../fullCourseDomain'
import FullCourseScene from './FullCourseScene.vue'
import FullTaskPanel from './FullTaskPanel.vue'
import FullSubmissionEvidence from './FullSubmissionEvidence.vue'
const course=useFullCourse(),portal=useFullPortal(),directory=ref(false),file=ref<HTMLInputElement>(),taskPanel=ref<InstanceType<typeof FullTaskPanel>>()
const step=computed(()=>fullSteps[course.saved.step-1]!)

const current=computed(()=>portal.current(course.saved)),review=computed(()=>current.value?.reviews.at(-1))
async function focusPage(){await nextTick();document.querySelector('.full-content')?.scrollIntoView({block:'start'});document.querySelector<HTMLElement>('.full-content h1')?.focus({preventScroll:true})}
function go(id:number){course.openStep(id);directory.value=false;portal.message='';void focusPage()}
function page(value:'overview'|'report'|'resources'){course.saved.page=value;directory.value=false;course.message='';void focusPage()}
function escape(event:KeyboardEvent){if(event.key==='Escape')directory.value=false}
onMounted(()=>document.addEventListener('keydown',escape))
onBeforeUnmount(()=>document.removeEventListener('keydown',escape))
function download(text:string,name:string){const url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function importFile(event:Event){const input=event.target as HTMLInputElement,f=input.files?.[0];try{if(f){if(f.size>8_000_000)throw Error('完整课程备份不能超过8 MB。');course.importJson(await f.text())}}catch(e){course.message=e instanceof Error?e.message:'备份读取失败。'}input.value=''}
function status(id:number){if(id<=7&&course.progress[id-1]?.success&&current.value)return review.value?'已批阅':'已提交';return course.status(id)}
</script>
<template><div class="full-course">
 <button class="btn full-directory-toggle" :aria-expanded="directory" @click="directory=!directory">{{ directory?'收起':'打开' }}完整课程目录</button>
 <button v-if="directory" class="full-directory-shade" aria-label="关闭完整课程目录" @click="directory=false"></button>
 <aside class="full-directory" :class="{'is-open':directory}" aria-label="完整课程目录与个人进度">
  <button class="full-directory-close core-link" @click="directory=false">关闭目录</button><div class="core-eyebrow">完整课程 · 综合实验</div><h2>四阶段 · 28步</h2><p class="core-small">8学时 / 360分钟<br>第一阶段已开放 · 待试教</p>
  <button class="full-nav-link" :class="{active:course.saved.page==='overview'}" @click="page('overview')">课程介绍</button>
  <section v-for="stage in fullStages" :key="stage.id"><h3>{{ stage.id }} {{ stage.title }}</h3><small>{{ stage.id===1?'交互已开放':'教学内容可预览 · 交互待建设' }} · 2学时</small><button v-for="s in fullSteps.filter(s=>s.stage===stage.id)" :key="s.id" class="full-step-link" :class="{active:course.saved.page==='task'&&course.saved.step===s.id}" @click="go(s.id)"><b>{{ String(s.id).padStart(2,'0') }}</b><span>{{ s.title }}<small>{{ status(s.id) }}</small></span></button></section>
  <button class="full-nav-link" :class="{active:course.saved.page==='report'}" @click="page('report')">阶段成果、报告与反馈</button><button class="full-nav-link" :class="{active:course.saved.page==='resources'}" @click="page('resources')">学习资源与评分</button>
 </aside>
 <main class="full-content">
  <div class="full-topline"><span>个人必要成果 {{ course.progress.filter(p=>p.success).length }}/7 · 其余21步待建设</span><span>第一阶段 {{ portal.score(course.saved) }}/24分 <small>{{ review?'已批阅':'含10分待教师评价' }}</small></span></div>
  <p v-if="course.error" class="core-warning">{{ course.error }}</p><p v-if="portal.error" class="core-warning">{{ portal.error }}</p>
  <header v-if="course.saved.page==='overview'" class="full-visual-heading"><div><div class="core-eyebrow">数字孪生技术与应用 / 完整课程</div><h1 tabindex="-1">在三维工厂中构建与验证数字孪生</h1><p>探索工厂、点选设备，让对象、数据和配置效果在同一场景中直观呈现。</p></div><button class="btn primary" @click="go(course.progress.find(p=>!p.success)?.step??1)">开始或继续第一阶段 →</button></header>
  <header v-else-if="course.saved.page==='task'" class="full-task-heading full-visual-heading"><div><div class="core-eyebrow">阶段{{ step.stage }} / 步骤{{ String(step.id).padStart(2,'0') }} · 操作{{ step.minutes }}分钟 · {{ step.points }}分</div><h1 tabindex="-1">{{ step.title }}</h1></div><span class="build-badge">{{ step.available?'交互已开放 · 待试教':'教学内容可预览 · 交互待建设' }}</span></header>
  <div v-if="course.saved.page==='overview'||course.saved.page==='task'" class="full-visual-workspace" :class="{'is-task':course.saved.page==='task'}">
   <FullCourseScene @edit-object="taskPanel?.focusAsset($event)"/>
   <FullTaskPanel v-if="course.saved.page==='task'" ref="taskPanel" :key="step.id" @go="go" @report="page('report')"/>
   <aside v-else class="full-overview-console"><div class="core-eyebrow">四阶段 · 8学时 · 28步</div><h2>先认识工厂，再动手构建</h2><p>双击区域和车间进入，点击设备查看身份、测点与关联。左侧目录选择任务，右侧配置与场景同步反馈。</p><ol><li>对象建模与系统设计</li><li>数据接入与质量治理</li><li>三维交互与状态规则</li><li>AI应用与综合验证</li></ol><p class="core-small">当前开放第一阶段7步交互，后续21步可预览教学内容。模型、进度和成绩独立于试课实验。</p><button class="btn primary" @click="go(course.progress.find(p=>!p.success)?.step??1)">进入实验工作台 →</button></aside>
  </div>
  <template v-if="course.saved.page==='overview'">
   <section class="full-stage-grid"><article v-for="s in fullStages" :key="s.id" class="core-card"><div class="core-eyebrow">阶段0{{ s.id }} · 90分钟</div><h2>{{ s.title }}</h2><p>{{ s.goal }}</p><p class="core-small">{{ s.output }}</p><button class="core-link" @click="go((s.id-1)*7+1)">{{ s.id===1?'进入实验':'预览教学内容' }} →</button></article></section>
   <section class="core-card"><h2>每阶段90分钟怎样学习</h2><p>问题导入与预测10分钟 → 七步交互任务55分钟 → 对照分析与复测15分钟 → 阶段验收与反馈10分钟。</p><p>全部28步说明已开放阅读。当前实现步骤1—7；后续交互按批次建设。课前阅读与先测不计入360分钟。配置、成果与评分均独立于试课实验。</p><p class="core-small">固定储罐、泵和换热器资源；程序化教学模型与模拟资料，无生产设备连接。第一阶段核对对象与源元数据，不运行工艺物理过程或AI模型。</p></section>
  </template>
  <template v-else-if="course.saved.page==='report'">
   <section class="core-card"><h1>第一阶段成果与反馈</h1><p>本阶段 {{ portal.score(course.saved) }}/24分 · 操作证据 {{ course.automatic }}/14 · {{ review?'需求 '+review.needs+'/5，架构 '+review.architecture+'/5':'需求与架构10分待教师评价' }}。其余阶段76分待建设，不计为学生失分。</p><button class="btn primary" :disabled="!course.ready" @click="portal.submit(course.saved)">{{ current?'当前版本已提交':'冻结并提交第一阶段成果' }}</button><p class="core-small">{{ current?'提交V'+current.id+' · '+(review?'已批阅':'待批阅'):'完成七步必要成果后提交。草稿后续修改不影响已提交副本；新版本单独批阅。' }}</p><p v-if="!current&&portal.submissions.length" class="core-warning">当前草稿与已提交版本不同，旧批阅保留在历史版本中，不计入当前成绩。</p><p v-if="portal.message" role="status">{{ portal.message }}</p></section>
   <section class="core-card"><h2>当前草稿的配置与证据</h2><FullSubmissionEvidence :snapshot="course.saved" /></section>
   <section class="core-card"><h2>提交与批阅历史</h2><p v-if="!portal.submissions.length">尚未提交第一阶段成果。</p><article v-for="r in [...portal.submissions].reverse()" :key="r.id" class="full-form-row"><h3>提交V{{ r.id }} · {{ r.basis===course.basis?'当前版本':'历史版本' }}</h3><p>{{ new Date(r.submittedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}) }} · {{ r.reviews.length?'已批阅':'待批阅' }}</p><p v-for="(v,i) in r.reviews" :key="i" class="full-preserve">{{ v.reviewer }}：需求{{ v.needs }}/5，架构{{ v.architecture }}/5 · 引用记录{{ v.recordIds.join('、') }}<br>{{ v.feedback }}</p><button class="core-link" @click="download(r.snapshotJson,'完整课程-第一阶段-提交V'+r.id+'.json')">导出本版本冻结成果</button></article></section>
  </template>
  <template v-else-if="course.saved.page==='resources'"><section class="core-card"><h1>学习资源与评分</h1><p>建议具备基础数据、设备对象和三维操作知识。课前阅读需求单与字段元数据，先回答“模型、资产和测点是否是同一个概念”，课后用实验记录修订解释。</p><div class="core-actions"><a href="./完整课程设计与实施.md" target="_blank" rel="noopener">完整课程设计与分批实施</a><a href="./完整课程学生指导.md" target="_blank" rel="noopener">第一阶段学生指导</a><a href="./完整课程教师评分说明.md" target="_blank" rel="noopener">教师评分说明</a></div><h2>完整课程100分评价</h2><div class="table-scroll"><table><thead><tr><th>维度</th><th>对应步骤</th><th>分值</th></tr></thead><tbody><tr v-for="r in fullRubric" :key="r.title"><td>{{ r.title }}</td><td>{{ r.steps.join('、') }}</td><td>{{ r.points }}</td></tr></tbody></table></div><p>第一阶段步骤1—2共10分由教师评价；步骤3—7共14分按验证证据计算。正式教学还需真实身份与服务端评价，本地批阅仅用于教学演示。</p></section></template>
  <footer class="full-footer"><span>完整课程独立自动保存 · 教学沙盒</span><div class="core-actions"><button class="core-link" @click="download(fullJson(course.saved,true),'完整课程-对象模型与证据.json')">导出课程备份</button><button class="core-link" @click="file?.click()">导入课程备份</button><button v-if="course.originalUnreadable" class="core-link" @click="download(course.originalUnreadable,'完整课程-原始存档诊断.json')">导出原始存档诊断</button></div><input ref="file" class="hidden" type="file" accept=".json" aria-label="完整课程备份文件" @change="importFile" /></footer>
  <p v-if="course.message&&course.saved.page!=='task'" class="full-feedback" role="status">{{ course.message }}</p>
 </main></div></template>
