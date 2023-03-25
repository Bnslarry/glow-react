import { beginWork } from './beginWork'
import { commitMutationEffects } from './commitWorks'
import { completeWork } from './completeWork'
import { createWorkInProgress, FiberNode, FiberRootNode } from './fiber'
import { MutationMask, NoFlags } from './fiberFlags'
import { HostRoot } from './workTags'

let workInProgress: FiberNode | null = null

function prepareFreshStack(root: FiberRootNode) {
	workInProgress = createWorkInProgress(root.current, {})
}

export function scheduleUpdateOnFiber(fiber: FiberNode) {
	// 调度功能
	const root = markUpdateFromFiberToRoot(fiber)
	renderRoot(root)
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

function renderRoot(root: FiberRootNode) {
	// init
	prepareFreshStack(root)

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

	// wip fiberNode 树 树中的 flags
	commitRoot(root)
}

function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress)
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber)
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

	// 重置
	root.finishWork = null

	// 判断是否存在3个子阶段需要执行的操作
	const subtreeHasEffects =
		(finishedWork.subtreeFlags & MutationMask) !== NoFlags
	const rootHasEffects = (finishedWork.flags & MutationMask) !== NoFlags

	if (subtreeHasEffects || rootHasEffects) {
		// beforeMutation
		// mutation
		commitMutationEffects(finishedWork)

		root.current = finishedWork

		// layout
	} else {
		root.current = finishedWork
	}
}
