// ReactDOM.create(root).render(<App/>)

import { Instance, Container } from './hostConfig'
import {
	createContainer,
	updateContainer
} from 'react-reconciler/src/fiberReconciler'
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from 'shared/ReactSymblos'
import { ReactElementType } from 'shared/ReactTypes'
import * as Scheduler from 'scheduler'

let idCounter = 0

export function createRoot() {
	const container: Container = {
		rootID: idCounter++,
		children: []
	}

	// @ts-ignore
	const root = createContainer(container)

	function getChildren(parent: Container | Instance) {
		if (parent) {
			return parent.children
		}
		return null
	}

	function getChildrenAsJSX(root: Container) {
		const children = childToJSX(getChildren(root))
		if (Array.isArray(children)) {
			return {
				$$typeof: REACT_ELEMENT_TYPE,
				type: REACT_FRAGMENT_TYPE,
				key: null,
				ref: null,
				props: { children },
				__mark: 'glow'
			}
		}
		return children
	}

	function childToJSX(child: any): any {
		if (typeof child === 'string' || typeof child === 'number') {
			return child
		}
		if (Array.isArray(child)) {
			if (child.length === 0) {
				return null
			}
			if (child.length === 1) {
				return childToJSX(child[0])
			}
			const children: any = child.map(childToJSX)
			// 如果每个child都是文本节点，将他们连接在一起形成string
			if (children.every((c: any) => ['string', 'number'].includes(typeof c))) {
				return children.join('')
			}
			// 混合了Instance与TextInstance，应该用Fragment处理
			return children
		}

		// Instance
		if (Array.isArray(child.children)) {
			const instance: Instance = child
			const children = childToJSX(instance.children)
			const props = instance.props

			if (children !== null) {
				props.children = children
			}

			return {
				$$typeof: REACT_ELEMENT_TYPE,
				type: instance.type,
				key: null,
				ref: null,
				props,
				__mark: 'glow'
			}
		}

		// TextInstance
		return child.text
	}

	return {
		_Scheduler: Scheduler,
		render(element: ReactElementType) {
			return updateContainer(element, root)
		},
		getChildren() {
			return getChildren(container)
		},
		getChildrenAsJSX() {
			return getChildrenAsJSX(container)
		}
	}
}
