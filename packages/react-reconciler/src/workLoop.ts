import { scheduleMicroTask } from 'hostConfig'
import { beginWork } from './beginWork'
import {
	commitHookEffectListCreate,
	commitHookEffectListDestroy,
	commitHookEffectListUnmount,
	commitMutationEffects
} from './commitWorks'
import { completeWork } from './completeWork'
import {
	createWorkInProgress,
	FiberNode,
	FiberRootNode,
	PendingPassiveEffects
} from './fiber'
import { MutationMask, NoFlags, PassiveMask } from './fiberFlags'
import {
	getHighestPriorityLane,
	Lane,
	markRootFinished,
	mergeLanes,
	NoLane,
	SyncLane
} from './fiberLanes'
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue'
import { HostRoot } from './workTags'
import {
	unstable_scheduleCallback as scheduleCallback,
	unstable_NormalPriority as NormalPriority
} from 'scheduler'
import { HookHasEffect, Passive } from './hookEffectTag'

let workInProgress: FiberNode | null = null
let wipRootRenderLane: Lane = NoLane
let rootDoesHasPassiveEffect = false

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	workInProgress = createWorkInProgress(root.current, {})
	wipRootRenderLane = lane
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	// 调度功能
	const root = markUpdateFromFiberToRoot(fiber)
	markRootUpdated(root, lane)
	ensureRootIsSchedule(root)
}

// schedule 阶段入口
function ensureRootIsSchedule(root: FiberRootNode) {
	const updateLane = getHighestPriorityLane(root.pendingLanes)
	if (updateLane === NoFlags) return
	if (updateLane === SyncLane) {
		// 同步 优先级 用微任务调度
		if (__DEV__) {
			console.log('在微任务中调度，优先级： ', updateLane)
		}
		// []
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane))
		scheduleMicroTask(flushSyncCallbacks)
	} else {
		// 其他优先级 用宏任务调度
	}
}

function markRootUpdated(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane)
}

function markUpdateFromFiberToRoot(fiber: FiberNode) {
	let node = fiber
	let parent = node.return
	while (parent !== null) {
		node = parent
		parent = node.return
	}
	if (node.tag === HostRoot) {
		return node.stateNode
	}
	return null
}

function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
	const nextLanes = getHighestPriorityLane(root.pendingLanes)

	if (nextLanes !== SyncLane) {
		// 其他比 SyncLane 低的优先级
		// NoLane
		ensureRootIsSchedule(root)
		return
	}

	if (__DEV__) {
		console.warn('render 阶段开始')
	}

	// init
	prepareFreshStack(root, lane)

	do {
		try {
			workLoop()
			break
		} catch (e) {
			console.warn('workLoop 发生错误', e)
			workInProgress = null
		}
	} while (true)

	const finishedWork = root.current.alternate
	root.finishWork = finishedWork
	root.finishedLane = lane
	wipRootRenderLane = NoLane

	// wip fiberNode 树 树中的 flags
	commitRoot(root)
}

function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress)
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber, wipRootRenderLane)
	fiber.memoizedProps = fiber.pendingProps

	if (next === null) {
		completeUnitOfWork(fiber)
	} else {
		workInProgress = next
	}
}

function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber
	do {
		completeWork(node)

		const sibling = node.sibling
		if (sibling !== null) {
			workInProgress = sibling
			return
		}
		node = node.return
		workInProgress = node
	} while (node !== null)
}

function commitRoot(root: FiberRootNode) {
	const finishedWork = root.finishWork

	if (finishedWork === null) {
		return
	}

	if (__DEV__) {
		console.warn('commit 阶段开始', finishedWork)
	}
	const lane = root.finishedLane

	if (lane === NoLane && __DEV__) {
		console.error('commit 阶段 finishedLane 不应该是 NoLane')
	}

	// 重置
	root.finishWork = null
	root.finishedLane = NoLane

	markRootFinished(root, lane)

	if (
		(finishedWork.flags & PassiveMask) !== NoFlags ||
		(finishedWork.subtreeFlags & PassiveMask) !== NoFlags
	) {
		if (!rootDoesHasPassiveEffect) {
			rootDoesHasPassiveEffect = true
			// 调度副作用
			scheduleCallback(NormalPriority, () => {
				// 执行副作用
				flushPassiveEffects(root.pendingPassiveEffects)
				return
			})
		}
	}
	// 判断是否存在3个子阶段需要执行的操作
	const subtreeHasEffects =
		(finishedWork.subtreeFlags & MutationMask) !== NoFlags
	const rootHasEffects = (finishedWork.flags & MutationMask) !== NoFlags

	if (subtreeHasEffects || rootHasEffects) {
		// beforeMutation
		// mutation
		commitMutationEffects(finishedWork, root)

		root.current = finishedWork

		// layout
	} else {
		root.current = finishedWork
	}

	rootDoesHasPassiveEffect = false
	ensureRootIsSchedule(root)
}

function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
	pendingPassiveEffects.unmount.forEach((effect) => {
		commitHookEffectListUnmount(Passive, effect)
	})
	pendingPassiveEffects.unmount = []

	pendingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListDestroy(Passive | HookHasEffect, effect)
	})
	pendingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListCreate(Passive | HookHasEffect, effect)
	})
	pendingPassiveEffects.update = []
	flushSyncCallbacks()
}
