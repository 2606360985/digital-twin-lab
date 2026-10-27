<script setup lang="ts">
import { computed } from 'vue'
import { useLab } from '../store'
import { assetReading } from '../domain'
const lab = useLab()
const values = computed(() => (lab.active?.samples ?? []).map(s => ({ tick: s.tick, value: assetReading(lab.active!.config, lab.selected, s)?.value ?? null })))
const top = computed(() => Math.max(12, ...values.value.map(v => v.value ?? 0)) + 1)
const xy = (tick: number, value: number) => `${35 + (tick - 1) / 39 * 650},${145 - value / top.value * 125}`
const raw = computed(() => values.value.filter(v => v.value !== null).map(v => xy(v.tick, v.value!)).join(' '))
const published = computed(() => (lab.active?.published ?? []).map(s => ({ tick: s.tick, value: assetReading(lab.active!.config, lab.selected, s)?.value ?? null })).filter(v => v.value !== null))
</script>
<template>
  <div class="core-chart"><p>试验 #{{ lab.active?.id ?? '—' }} · 记录配置中的{{ lab.selected === 'pump' ? '泵测点' : lab.selected === 'tank' ? '液位' : '出口温度' }} <span>灰线：源样本　绿点：已发布　橙点：规则触发</span></p>
  <svg viewBox="0 0 710 180" role="img" aria-label="源样本、发布点和规则触发事件时间对照图">
    <title>固定1—40秒输入，发布遗漏不代表源样本遗漏</title>
    <line x1="35" y1="145" x2="690" y2="145" stroke="#c4d7d4"/><line x1="35" y1="15" x2="35" y2="145" stroke="#c4d7d4"/>
    <text x="3" y="25">{{ top.toFixed(0) }}</text><text x="16" y="145">0</text>
    <text v-for="t in [1,10,20,30,40]" :key="t" :x="35+(t-1)/39*650" y="170">{{ t }}s</text>
    <polyline :points="raw" fill="none" stroke="#9dadaa" stroke-width="1.8"/>
    <circle v-for="s in published" :key="s.tick" :cx="35+(s.tick-1)/39*650" :cy="145-s.value!/top*125" r="3.6" fill="#087e72"><title>{{ s.tick }}秒：{{ s.value }}</title></circle>
    <template v-if="lab.selected === 'pump'"><line v-for="e in lab.active?.detections.filter(e=>e.type==='trigger')" :key="e.tick" :x1="35+(e.tick-1)/39*650" :x2="35+(e.tick-1)/39*650" y1="15" y2="145" stroke="#d07538" stroke-dasharray="3 3"/><line v-if="lab.active" x1="35" x2="690" :y1="145-lab.active.config.rule.high/top*125" :y2="145-lab.active.config.rule.high/top*125" stroke="#e6b080" stroke-dasharray="4 4"/></template>
  </svg><p v-if="!lab.active?.tick">尚无数据。先保存预测并新建试验。</p></div>
</template>
