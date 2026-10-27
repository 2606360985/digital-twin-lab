export const SYSTEM_TITLE = '基于数字孪生的废塑料热解炼油智能工厂教学系统'
export const EXPERIMENT_TITLE = '泵电流监测单元的数字孪生构建与告警验证'
export const courseModules = [
 { id:'pump-core', title:EXPERIMENT_TITLE, status:'已开放 · 待试教', available:true },
 { id:'data-quality', title:'数据质量与缓存补传', status:'待建设', available:false },
 { id:'state-machine', title:'设备状态机设计', status:'待建设', available:false },
 { id:'ai-validation', title:'AI知识库与异常检测', status:'待建设', available:false }
]
export const learningHints = [
 { purpose:'建立可检验的实验目标，先预测再用实际结果核对。', keys:[0,1], focus:'区分模型外形、资产身份和数据来源，检查对象与测点是否能对应。', output:'保存预测，建立初始关联链。' },
 { purpose:'通过只改变一个关联，发现错配并证明修复有效。', keys:[0,1], focus:'观察实际资产编码、源字段、源单位、字典单位与数据质量，而非只看模型外形。', output:'绑定错误/修复和字段错误/修复的对照记录与观察。' },
 { purpose:'区分源数据计算与屏幕发布，理解显示稀疏带来的信息损失。', keys:[2], focus:'保持输入和其他参数一致，比较发布点、短时变化可见性以及源事件时刻。', output:'两种周期的完整仿真记录及对照结论。' },
 { purpose:'区分持续条件和恢复滞回的作用，用实验评价策略代价。', keys:[3], focus:'比较误触发、检测延迟、状态切换及恢复；区分检测信号与人工处置状态。', output:'三策略同输入对照与事件确认、恢复、关闭记录。' },
 { purpose:'在新台账中独立诊断，并用可追溯证据形成结论。', keys:[0,1,2,3], focus:'保留新编码，独立核对关联链；结论引用具体仿真记录和实测结果。', output:'新配置验收、实验报告及适用边界，正式提交后查看教师反馈。' }
]
