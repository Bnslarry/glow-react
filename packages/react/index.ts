import {
	Dispatcher,
	resolveDispatcher,
	currentDispatcher
} from './src/currentDispatcher'
import { jsxDEV } from './src/jsx'
// React

export const useState: Dispatcher['useState'] = (initialState) => {
	const dispatcher = resolveDispatcher()
	return dispatcher.useState(initialState)
}

// 内部数据共享层
export const __SECRECT_INTERNALS_DO_NOT_USER_OR_YOU_WILL_BE_FIRED__ = {
	currentDispatcher
}

export default {
	version: '0.0.0',
	createElement: jsxDEV
}
