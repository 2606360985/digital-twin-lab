<script setup lang="ts">
import { computed,ref,nextTick } from 'vue'
import { useFullCourse } from '../fullCourseStore'
import { fullSteps } from '../fullCurriculum'
import type { Equipment } from '../domain'
import FullStepEditor from './FullStepEditor.vue'
const course=useFullCourse(),hint=ref(-1),editor=ref<InstanceType<typeof FullStepEditor>>(),feedback=ref<HTMLElement>()
async function validate(){course.validate();await nextTick();feedback.value?.scrollIntoView({block:'nearest'})}
const step=computed(()=>fullSteps[course.saved.step-1]!)
const prerequisite=computed(()=>step.value.available?course.missingPrerequisite(step.value.id):'')
const emit=defineEmits<{go:[id:number];report:[]}>()
defineExpose({focusAsset:(id:Equipment)=>editor.value?.focusAsset(id)})
</script>
<template><aside class="full-task-console" aria-label="当前步骤任务与配置">
 <div class="full-console-heading"><span>当前任务 · {{ String(step.id).padStart(2,'0') }}/28</span><h2>{{ step.title }}</h2><p>{{ step.question }}</p></div>
 <div class="full-console-body">
  <details class="full-task-instructions"><summary>目标与操作任务</summary><p>{{ step.goal }}</p><ol><li v-for="action in step.actions" :key="action">{{ action }}</li></ol></details>
  <section v-if="step.available"><h3>实验工作台</h3><div v-if="prerequisite" class="core-warning"><p>{{ prerequisite }}</p><button class="core-link" @click="emit('go',step.id-1)">返回步骤{{ step.id-1 }}补齐成果 →</button></div>
   <fieldset :disabled="!!prerequisite"><legend class="scene-sr-only">当前步骤操作与证据</legend><label class="field"><span>先预测：本次配置会产生什么反馈？</span><textarea v-model="course.saved.inputs[step.id-1]!.prediction" aria-label="本步预测" rows="2" maxlength="10000" /></label><FullStepEditor v-if="!prerequisite" ref="editor" :key="step.id"/><label class="field"><span>实际观察与解释</span><textarea v-model="course.saved.inputs[step.id-1]!.observation" aria-label="本步观察" rows="3" maxlength="10000" placeholder="结合三维对象、配置与校验结果记录观察" /></label><button class="btn primary" @click="validate()">校验并保存本次证据</button><p class="core-small">步骤6、7需在当前配置的画布上实际点选三台设备；定位和查看说明不代替验证。</p></fieldset>
  </section><section v-else><h3>交互待建设</h3><p>当前可在三维窗口浏览和定位设备。本步的专项工具、运行与评分待后续批次开放；浏览不会产生完成状态或成绩。</p></section>
  <p v-if="course.message" ref="feedback" class="full-feedback" role="status">{{ course.message }}</p>
  <details><summary>必要原理</summary><p>{{ step.principle }}</p></details><details><summary>成果与评价</summary><p>{{ step.evidence }}</p><p v-if="step.available">个人状态：{{ course.status(step.id) }}。必要成果通过即可继续，无需等待教师录分。</p></details>
  <details><summary>分级提示</summary><button class="btn" @click="hint=Math.min(2,hint+1)">{{ hint<2?'查看下一级提示':'已展开全部提示' }}</button><p v-for="(h,i) in step.hints.slice(0,hint+1)" :key="i">{{ i+1 }}. {{ h }}</p><p class="core-small">提示不增加成绩。</p></details>
  <details v-if="step.available&&course.saved.records.some(r=>r.step===step.id)"><summary>本步验证记录</summary><p v-for="r in course.saved.records.filter(r=>r.step===step.id).slice(-8).reverse()" :key="r.id">#{{ r.id }} · {{ new Date(r.at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}) }} · 输入已冻结，完整反馈见阶段报告。</p></details>
 </div><nav class="core-actions full-console-navigation" aria-label="课程步骤切换"><button v-if="step.id>1" class="btn" @click="emit('go',step.id-1)">← 上一步</button><button v-if="step.id<28" class="btn" @click="emit('go',step.id+1)">下一步 {{ step.id===7?'（预览）':'' }} →</button><button v-if="step.id===7" class="btn primary" @click="emit('report')">查看第一阶段成果</button></nav>
</aside></template>
