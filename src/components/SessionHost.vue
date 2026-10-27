<script setup lang="ts">
import { provide } from 'vue'
import { labSessionKey } from '../session'
import type { LabSession } from '../store'
const props = defineProps<{ session: LabSession }>()
provide(labSessionKey, props.session)
</script>
<template><slot /></template>
