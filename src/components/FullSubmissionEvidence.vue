<script setup lang="ts">
import { computed } from 'vue'
import type { FullSaved } from '../fullCourseDomain'
import { fullAutomaticScore,progressOf,recordFindings,componentNames,configVersion } from '../fullCourseDomain'
import { fullSteps } from '../fullCurriculum'
const props=defineProps<{snapshot:FullSaved}>()
const progress=computed(()=>progressOf(props.snapshot))
</script>
<template><div class="full-evidence"><p>第一阶段操作证据 {{ fullAutomaticScore(snapshot) }}/14；需求与架构论证共10分，由教师录入。数据版本：{{ snapshot.dataset }}</p>
 <div class="table-scroll"><table><thead><tr><th>步骤</th><th>成果状态</th><th>预测与观察</th></tr></thead><tbody><tr v-for="(p,i) in progress" :key="p.step"><td>{{ p.step }} {{ fullSteps[i]?.title }}</td><td>{{ p.success?'已验证':p.stale?'待复验':'待完成' }} · 记录#{{ p.success?.id??'—' }}</td><td class="full-preserve">预测：{{ snapshot.inputs[i]?.prediction }}<br>观察：{{ snapshot.inputs[i]?.observation }}</td></tr></tbody></table></div>
 <h3>需求与验收条件</h3><article v-for="r in snapshot.config.requirements" :key="r.kind"><strong>{{ r.kind }}</strong><p class="full-preserve">{{ r.need }}<br>验收：{{ r.acceptance }}</p></article>
 <h3>系统架构</h3><p class="full-preserve">{{ snapshot.config.architecture.rationale }}</p><ul><li v-for="(e,i) in snapshot.config.architecture.edges" :key="i">{{ componentNames[e.from] }} → {{ componentNames[e.to] }} · {{ e.access==='read'?'读取':'写入' }}</li></ul>
 <details><summary>台账、字典、布局与映射配置</summary><pre>{{ JSON.stringify(snapshot.config,null,2) }}</pre></details>
 <details><summary>逐次验证证据（{{ snapshot.records.length }}条）</summary><article v-for="(r,i) in snapshot.records" :key="r.id" class="full-form-row"><h4>#{{ r.id }} · 步骤{{ r.step }} · {{ new Date(r.at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}) }}</h4><p class="core-small">本地学习者 · 数据{{ r.dataset }} · 配置版本{{ configVersion(r.config) }}</p><p>{{ recordFindings(r,snapshot.records.slice(0,i)).map(f=>f.message).join('；')||'本次局部校验通过；前置成果与最终状态见上表。' }}</p><p class="full-preserve">预测：{{ r.inputs[r.step-1]?.prediction }}<br>观察：{{ r.inputs[r.step-1]?.observation }}</p><details><summary>本次冻结的输入与实体点选</summary><pre>{{ JSON.stringify({config:r.config,clicks:r.clicks},null,2) }}</pre></details></article></details>
</div></template>
