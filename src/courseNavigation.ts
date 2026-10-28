import { ref,watch } from 'vue'
import { defineStore } from 'pinia'
export const ENTRY_KEY='twin-workshop:course-entry:v1'
export const useCourseNavigation=defineStore('course-navigation',()=>{
 const entry=ref<'home'|'trial'|'full'>('home')
 try{const raw=localStorage.getItem(ENTRY_KEY);if(raw==='trial'||raw==='full')entry.value=raw}catch{/* The landing remains available when storage is blocked. */}
 watch(entry,value=>{try{localStorage.setItem(ENTRY_KEY,value)}catch{/* Learning stores expose persistence errors. */}})
 return {entry}
})
