import { inject, type InjectionKey } from 'vue'
import { useLab, type LabSession } from './store'
export const labSessionKey: InjectionKey<LabSession> = Symbol('lab-session')
export function useLabSession(): LabSession { return inject(labSessionKey, null) ?? useLab() }
