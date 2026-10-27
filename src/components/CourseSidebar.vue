<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useLabSession } from '../session'
import { courseModules } from '../curriculum'
import { phases } from '../scenario'
import { coreCorrect } from '../domain'
const props=defineProps<{open?:boolean;tutorial?:boolean}>()
const emit=defineEmits<{close:[]}>()
const lab=useLabSession()
const earned=computed(()=>Object.fromEntries(lab.results.map(r=>[r.id,r.earned===r.max])))
const statuses=computed(()=>[
 !!lab.saved.predictions.mapping.trim()&&(coreCorrect(lab.saved.config)||lab.saved.trials.some(t=>coreCorrect(t.config))),
 earned.value.binding&&earned.value.field,earned.value.period,earned.value.strategy&&earned.value.incident,earned.value.transfer&&lab.submitted
])
const completed=computed(()=>lab.results.filter(r=>r.earned===r.max).length)
function go(index:number){if(props.tutorial&&index!==0)return;lab.setPhase(index);lab.page='lab';emit('close')}
function escape(event:KeyboardEvent){if(event.key==='Escape'&&props.open)emit('close')}
onMounted(()=>document.addEventListener('keydown',escape))
onBeforeUnmount(()=>document.removeEventListener('keydown',escape))
</script>
<template><div v-if="open" class="course-backdrop" @click="emit('close')"></div><aside class="course-sidebar" :class="{'is-open':open}" data-guide="directory" aria-label="课程目录与进度"><button class="directory-close core-link" @click="emit('close')">关闭目录</button><div class="core-eyebrow">课程目录</div><h2>实验课程与建设状态</h2><div class="course-current"><span class="build-badge">{{ tutorial?'独立演练 · 不计分':'已开放 · 待试教' }}</span><h3>{{ courseModules[0]!.title }}</h3><p v-if="!tutorial" class="core-small">个人实验证据 {{ completed }}/6 项达成<br>与课程建设状态分别统计</p><p v-else class="core-small">使用演练存储，正式学习进度不受影响。</p><nav aria-label="实验环节"><button v-for="(p,i) in phases" :key="p.title" :class="{active:lab.saved.phase===i&&lab.page==='lab'}" :disabled="tutorial&&i!==0" @click="go(i)"><b>0{{ i+1 }}</b><span>{{ p.title }}<small>{{ tutorial?'由操作引导推进':i===4&&lab.submitted?(lab.reviewValid?'已批阅':'已提交 · 待批阅'):statuses[i]?'已达成':'待完成' }}</small></span></button></nav><button class="core-link" @click="lab.page='report';emit('close')" :disabled="tutorial">实验报告与反馈 →</button></div><div class="future-modules"><article v-for="course in courseModules.slice(1)" :key="course.id"><h3>{{ course.title }}</h3><span>{{ course.status }}</span><p>尚未开放，后续逐步建设。</p></article></div><div class="sidebar-note">完整课程为8学时、28步规划。当前开放一个90分钟核心实验。</div></aside></template>
