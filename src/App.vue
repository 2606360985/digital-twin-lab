<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useLab, useTutorialLab } from './store'
import { useGuide } from './guide'
import { usePortal } from './portal'
import { SYSTEM_TITLE } from './curriculum'
import SessionHost from './components/SessionHost.vue'
import StudentWorkspace from './components/StudentWorkspace.vue'
import CourseSidebar from './components/CourseSidebar.vue'
import TeacherWorkspace from './components/TeacherWorkspace.vue'
import TutorialGuide from './components/TutorialGuide.vue'
const lab=useLab(),tutorial=useTutorialLab(),guide=useGuide(),portal=usePortal(),directoryOpen=ref(false),welcome=ref(false),guideRenderKey=ref(0)
const session=computed(()=>guide.active?tutorial:lab)
watch(()=>[lab.submitted,lab.basis,lab.saved.review],()=>portal.syncCurrent(lab),{deep:true})
watch(()=>guide.step,()=>{directoryOpen.value=false})
watch(()=>tutorial.controlHistory,value=>guide.rememberControls(value),{deep:true})
onMounted(()=>{portal.syncCurrent(lab,'v2历史迁入');welcome.value=portal.role==='student'&&!guide.seen&&!lab.saved.trials.length;if(welcome.value)nextTick(()=>document.querySelector<HTMLButtonElement>('.onboarding-welcome button')?.focus())})
function enter(){guide.seen=true;welcome.value=false;lab.page='lab'}
function start(restart=false){welcome.value=false;portal.setRole('student');lab.pause();guide.start(tutorial,restart);guideRenderKey.value++;directoryOpen.value=false}
function close(){guide.close(tutorial);directoryOpen.value=false;nextTick(()=>document.querySelector<HTMLButtonElement>('[data-help-entry]')?.focus())}
function switchRole(role:'student'|'teacher'){lab.pause();portal.setRole(role);portal.message='';directoryOpen.value=false;welcome.value=false}
function submitPractice(){if(!guide.submit(tutorial))tutorial.lastMessage='请完成高亮引导、两轮仿真和观察，并填写演练结论。';else tutorial.lastMessage='演练已提交。正式记录和教师批阅列表没有变化，可返回正式实验。'}
</script>
<template><div class="core-shell portal-shell"><header class="system-header"><button class="system-title" @click="!guide.active&&(lab.page='overview')">{{ SYSTEM_TITLE }}<small>核心实验 v2.2.1 · {{ guide.active?'独立流程演练':portal.role==='teacher'?'教师端演示':'学生端' }}</small></button><div class="header-actions"><nav v-if="portal.role==='student'" aria-label="主导航"><button :disabled="guide.active" @click="lab.page='overview'">课程总览</button><button :disabled="guide.active" @click="lab.page='lab'">实验工作台</button><button :disabled="guide.active" @click="lab.page='report'">实验报告</button></nav><button class="btn help-entry" data-help-entry :disabled="guide.active" @click="start()">操作引导</button><div class="role-switch" aria-label="角色演示"><button :class="{active:portal.role==='student'}" :disabled="guide.active" @click="switchRole('student')">学生端</button><button :class="{active:portal.role==='teacher'}" :disabled="guide.active" @click="switchRole('teacher')">教师端演示</button></div></div></header><div class="role-notice">本地角色演示，尚无真实账号权限隔离。<span v-if="guide.active">正在使用独立演练实例，不计分、不进入教师批阅。</span><span v-else>报告提交与批阅保存在同一浏览器，不跨设备同步。</span></div>
<template v-if="portal.role==='student'"><button class="directory-toggle btn" @click="directoryOpen=!directoryOpen">{{ directoryOpen?'收起课程目录':'打开课程目录' }}</button><SessionHost :key="guide.active?'tutorial':'formal'" :session="session"><div class="student-layout"><CourseSidebar :open="directoryOpen" :tutorial="guide.active" @close="directoryOpen=false"/><div class="student-content"><StudentWorkspace :tutorial="guide.active" @submitted="portal.syncCurrent(lab)" @practice-submit="submitPractice" /></div></div></SessionHost></template><TeacherWorkspace v-else @graded="portal.syncCurrent(lab)" />
<TutorialGuide v-if="guide.active" :key="guideRenderKey" :session="tutorial" @exit="close" @restart="start(true)" />
<div v-if="welcome" class="modal-backdrop"><section class="modal onboarding-welcome" role="dialog" aria-modal="true" aria-label="首次使用操作引导"><div class="core-eyebrow">欢迎开始核心实验</div><h2>先熟悉操作，再用证据完成实验</h2><p>约5分钟高亮演练，实际体验配置、仿真、调试、记录和提交。演练与正式记录完全分开。</p><div class="core-actions"><button class="btn primary" @click="start()">先学习操作流程</button><button class="btn" @click="enter">直接进入实验</button></div><p class="core-small">之后随时通过页眉“操作引导”重看。</p></section></div>
</div></template>
