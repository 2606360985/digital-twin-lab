<script setup lang="ts">
import { useCourseNavigation } from './courseNavigation'
import { usePortal } from './portal'
import { useLab } from './store'
import { useGuide } from './guide'
import { nextTick } from 'vue'
import { SYSTEM_TITLE } from './curriculum'
import CoreExperiment from './App.vue'
import FullCourseWorkspace from './components/FullCourseWorkspace.vue'
import FullCourseTeacher from './components/FullCourseTeacher.vue'
import { BookOpen,FlaskConical,ArrowRight,Network,Layers,ClipboardCheck } from 'lucide-vue-next'
const navigation=useCourseNavigation(),portal=usePortal(),lab=useLab(),guide=useGuide()
async function choose(entry:'home'|'trial'|'full'){if(guide.active)return;lab.pause();navigation.entry=entry;await nextTick();window.scrollTo({top:0})}
</script>
<template><div class="core-shell learning-app"><header class="course-switchbar"><button class="course-switch-title" :disabled="guide.active" @click="choose('home')">数字孪生学习中心</button><nav aria-label="课程入口"><button :disabled="guide.active" :class="{active:navigation.entry==='home'}" @click="choose('home')">学习首页</button><button :disabled="guide.active" :class="{active:navigation.entry==='trial'}" @click="choose('trial')">试课体验</button><button :disabled="guide.active" :class="{active:navigation.entry==='full'}" @click="choose('full')">完整课程</button></nav><div v-if="navigation.entry!=='trial'" class="role-switch" aria-label="角色演示"><button :class="{active:portal.role==='student'}" @click="portal.setRole('student')">学生端</button><button :class="{active:portal.role==='teacher'}" @click="portal.setRole('teacher')">教师端演示</button></div></header>
<template v-if="navigation.entry!=='trial'"><div class="learning-system-name">{{ SYSTEM_TITLE }}</div><div class="role-notice">本地角色演示，尚无真实账号权限隔离。<span>报告提交与批阅保存在同一浏览器，不跨设备同步。两个入口的进度与成绩分别保存。</span></div></template>
<main v-if="navigation.entry==='home'" class="course-landing"><div class="landing-kicker">DIGITAL TWIN / LEARNING STUDIO</div><h1>选择你的学习路径</h1><p class="landing-intro">从一次有证据的试验开始，逐步构建能够验证、解释与复现的数字孪生原型。</p>
<div class="landing-cards"><article class="landing-card trial"><div class="landing-icon"><FlaskConical :size="29"/></div><div class="landing-meta">体验与试课 · 已开放 · 待试教</div><h2>核心实验<span>试课体验</span></h2><p>用泵电流监测任务，体验对象关联、数据回放、告警对照与证据报告的完整流程。</p><div class="landing-tags"><span>2学时 / 90分钟</span><span>5个教学环节</span><span>70＋30分</span></div><ul><li>关联错配与修复</li><li>发布周期、持续条件与滞回</li><li>迁移任务、报告与教师反馈</li></ul><button class="btn primary" @click="choose('trial')">{{ portal.role==='teacher'?'查看试课批阅':'进入试课体验' }} <ArrowRight :size="16"/></button></article>
<article class="landing-card comprehensive"><div class="landing-icon"><BookOpen :size="29"/></div><div class="landing-meta">综合项目 · 第一阶段已开放 · 待试教</div><h2>完整课程<span>综合实验</span></h2><p>围绕同一设备单元，连续完成对象建模、数据治理、状态联动与AI应用验证。</p><div class="landing-tags"><span>8学时 / 360分钟</span><span>四阶段28步</span><span>完整评价100分</span></div><ul><li>28步教学目标、原理与任务可预览</li><li>步骤1—7可实际操作、验证与提交</li><li>后续阶段交互按批次建设</li></ul><button class="btn primary" @click="choose('full')">{{ portal.role==='teacher'?'查看完整课程批阅':'进入完整课程' }} <ArrowRight :size="16"/></button></article></div>
<div class="landing-principles"><span><Network :size="20"/> 同一教学工厂，分别记录进度</span><span><Layers :size="20"/> 配置、试验、修复与复测</span><span><ClipboardCheck :size="20"/> 用可追溯证据解释结果</span></div><p class="core-small">使用固定教学资源与模拟数据，不连接生产设备。完整课程成绩独立计算，试课成绩不自动转入。</p></main>
<CoreExperiment v-else-if="navigation.entry==='trial'"/>
<FullCourseWorkspace v-else-if="portal.role==='student'"/><FullCourseTeacher v-else/>
</div></template>
