<script setup lang="ts">
import { computed } from 'vue'
import { learningHints } from '../curriculum'
import { knowledge } from '../scenario'
const props=defineProps<{phase:number}>()
const hint=computed(()=>learningHints[props.phase]!)
</script>
<template><section class="core-card learning-hints" data-guide="learning"><div class="core-eyebrow">先理解为什么，再决定怎么做</div><h2>本环节学习提示</h2><h3>实验目的</h3><p>{{ hint.purpose }}</p><h3>核心知识</h3><details v-for="index in hint.keys" :key="index"><summary>{{ knowledge[index]!.title }}</summary><p>{{ knowledge[index]!.content }}</p></details><h3>观察重点</h3><p>{{ hint.focus }}</p><h3>成果要求</h3><p>{{ hint.output }}</p></section></template>
