import {
	appendInitialChild,
	Container,
	createInstance,
	createTextInstance
} from 'hostConfig'
import { updateFiberProps } from 'react-dom/src/SyntheticEvent'
import { FiberNode } from './fiber'
import { NoFlags, Update } from './fiberFlags'
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags'

function markUpdate(fiber: FiberNode) {
	fiber.flags |= Update
}

// 递归中的归阶段
export const completeWork = (wip: FiberNode) => {
	const newProps = wip.pendingProps
	const current = wip.alternate

	switch (wip.tag) {
		case HostComponent:
			if (current !== null && current.stateNode) {
				// update
				// props 是否变化
				// 变化时标记 Update flag
				updateFiberProps(wip.stateNode, newProps)
				// TODO work
				// className style 等的变化判断
			} else {
				// mount
				// 1. 构建 DOM
				// const instance = createInstance(wip.type, newProps)
				const instance = createInstance(wip.type, newProps)
				// 2. 将 DOM 插入到 DOM 树中
				appendAllChildren(instance, wip)
				wip.stateNode = instance
			}
			bubbleProperties(wip)
			return null
		case HostText:
			if (current !== null && current.stateNode) {
				// update
				const oldText = current.memoizedProps?.content
				const newText = newProps.content
				if (oldText !== newText) {
					markUpdate(wip)
				}
			} else {
				// 1. 构建 DOM
				const instance = createTextInstance(newProps.content)
				wip.stateNode = instance
			}
			bubbleProperties(wip)
			return null
		case HostRoot:
			bubbleProperties(wip)
			return null
		case FunctionComponent:
			bubbleProperties(wip)
			return null

		default:
			if (__DEV__) {
				console.warn('未处理的completeWork情况', wip)
			}
			break
	}
}

function appendAllChildren(parent: Container, wip: FiberNode) {
	let node = wip.child
	while (node !== null) {
		if (node.tag === HostComponent || node.tag === HostText) {
			appendInitialChild(node?.stateNode, parent)
		} else if (node.child !== null) {
			node.child.return = node
			node = node.child
			continue
		}
		if (node === wip) {
			return
		}
		while (node.sibling === null) {
			if (node.return === null || node.return === wip) {
				return
			}
			node = node?.return
		}
		node.sibling.return = node.return
		node = node.sibling
	}
}

function bubbleProperties(wip: FiberNode) {
	let subtreeFlags = NoFlags
	let child = wip.child

	while (child !== null) {
		subtreeFlags |= child.subtreeFlags
		subtreeFlags |= child.flags

		child.return = wip
		child = child.sibling
	}
	wip.subtreeFlags |= subtreeFlags
}
