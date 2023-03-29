import { Dispatcher, Dispatch } from 'react/src/currentDispatcher'
import internals from 'shared/internals'
import { Action } from 'shared/ReactTypes'
import { FiberNode } from './fiber'
import { Lane, NoLane, requestUpdateLane } from './fiberLanes'
import {
	createUpdate,
	enqueueUpdate,
	UpdateQueue,
	createUpdateQueue,
	processUpdateQueue
} from './updateQueue'
import { scheduleUpdateOnFiber } from './workLoop'

let currentlyRenderingFiber: FiberNode | null = null
let workInProgressHook: Hook | null = null
let currentHook: Hook | null = null
let renderLane: Lane = NoLane

const { currentDispatcher } = internals

interface Hook {
	memoizedState: any
	updateQueue: unknown
	next: Hook | null
}

export function renderWithHooks(wip: FiberNode, lane: Lane) {
	// 赋值操作
	currentlyRenderingFiber = wip
	// 重置
	wip.memoizedState = null
	renderLane = lane

	const current = wip.alternate

	if (current !== null) {
		// update
		currentDispatcher.current = HooksDispatcherOnUpdate
	} else {
		// mount
		currentDispatcher.current = HooksDispatcherOnMount
	}

	const Component = wip.type
	const props = wip.pendingProps
	const children = Component(props)

	// 重置操作
	currentlyRenderingFiber = null
	workInProgressHook = null
	currentHook = null
	renderLane = NoLane
	return children
}

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState
}

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState
}

function mountState<State>(
	initialState: (() => State) | State
): [State, Dispatch<State>] {
	// 找到当前 useState 对应的 hook 数据
	const hook = mountWorkInProgressHook()
	let memoizedState

	if (initialState instanceof Function) {
		memoizedState = initialState()
	} else {
		memoizedState = initialState
	}

	const queue = createUpdateQueue<State>()
	hook.updateQueue = queue
	hook.memoizedState = memoizedState

	// @ts-ignore
	const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue)
	queue.dispatch = dispatch
	return [memoizedState, dispatch]
}

function updateState<State>(): [State, Dispatch<State>] {
	// 找到当前 useState 对应的 hook 数据
	const hook = updateWorkInProgressHook()

	// 计算新 state 的逻辑
	const queue = hook.updateQueue as UpdateQueue<State>
	const pending = queue.shared.pending

	if (pending !== null) {
		const { memoizedState } = processUpdateQueue(
			hook.memoizedState,
			pending,
			renderLane
		)
		hook.memoizedState = memoizedState
	}

	return [hook.memoizedState, queue.dispatch as Dispatch<State>]
}

function dispatchSetState<State>(
	fiber: FiberNode,
	updateQueue: UpdateQueue<State>,
	action: Action<State>
) {
	const lane = requestUpdateLane()
	const update = createUpdate(action, lane)
	enqueueUpdate(updateQueue, update)
	scheduleUpdateOnFiber(fiber, lane)
}

function mountWorkInProgressHook(): Hook {
	const hook: Hook = {
		memoizedState: null,
		updateQueue: null,
		next: null
	}
	if (workInProgressHook === null) {
		// mount 时，第一个 hook
		if (currentlyRenderingFiber === null) {
			throw new Error('请在函数组件内调用 hook')
		} else {
			workInProgressHook = hook
			currentlyRenderingFiber.memoizedState = workInProgressHook
		}
	} else {
		// mount 时，后续的 hook
		workInProgressHook.next = hook
		workInProgressHook = hook
	}
	return workInProgressHook
}

function updateWorkInProgressHook(): Hook {
	// TODO render 阶段触发的更新
	let nextCurrentHook: Hook | null

	if (currentHook === null) {
		// 这是 FC update 时的第一个 hook
		const current = currentlyRenderingFiber?.alternate
		if (current !== null) {
			nextCurrentHook = current?.memoizedState
		} else {
			// mount
			nextCurrentHook = null
		}
	} else {
		// FC update 时，后续的 hook
		nextCurrentHook = currentHook.next
	}

	if (nextCurrentHook === null) {
		// mount / update u1 u2 u3
		// update         u1 u2 u3 u4
		// 更新后的 hook 数量变多
		throw new Error(
			`组件${currentlyRenderingFiber?.type}本次执行时的 Hook 比上次执行时多`
		)
	}

	currentHook = nextCurrentHook as Hook
	const newHook = {
		memoizedState: currentHook.memoizedState,
		updateQueue: currentHook.updateQueue,
		next: null
	}
	if (workInProgressHook === null) {
		// mount 时，第一个 hook
		if (currentlyRenderingFiber === null) {
			throw new Error('请在函数组件内调用 hook')
		} else {
			workInProgressHook = newHook
			currentlyRenderingFiber.memoizedState = workInProgressHook
		}
	} else {
		// mount 时，后续的 hook
		workInProgressHook.next = newHook
		workInProgressHook = newHook
	}
	return workInProgressHook
}
