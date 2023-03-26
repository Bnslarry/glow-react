import { FiberNode } from 'react-reconciler/src/fiber'
import { HostText } from 'react-reconciler/src/workTags'

export type Container = Element
export type Instance = Element
export type TextInstance = Text

// export const createInstance = (type: string, props: any): Instance => {
export const createInstance = (type: string): Instance => {
	const element = document.createElement(type)
	return element
}

export const appendInitialChild = (
	child: Instance,
	parent: Instance | Container
) => {
	parent.appendChild(child)
}

export const createTextInstance = (content: string) => {
	return document.createTextNode(content)
}

export const appendChildToContainer = appendInitialChild

export function commitUpdate(fiber: FiberNode) {
	switch (fiber.tag) {
		case HostText:
			const text = fiber.memoizedProps.content
			return commitTextUpdate(fiber.stateNode, text)
			break
		default:
			if (__DEV__) {
				console.warn('未实现的 Update 类型', fiber)
			}
			break
	}
}

export function commitTextUpdate(textInstance: TextInstance, content: string) {
	textInstance.textContent = content
}

export function removeChild(child: Instance | Text, container: Container) {
	container.removeChild(child)
}
