import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-noop-renderer'

// function App() {
// 	const [num, setNum] = useState(100)

// 	const arr =
// 		num % 2 === 0
// 			? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
// 			: [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>]
// 	return (
// 		<ul
// 			onClickCapture={() => {
// 				setNum((num) => num + 1)
// 				setNum((num) => num + 1)
// 				setNum((num) => num + 1)
// 			}}
// 		>
// 			{num}
// 		</ul>
// 	)
// 	// return <ul onClickCapture={() => setNum(num + 1)}>{arr}</ul>
// }

// function Child() {
// 	return <span>glow-react!!</span>
// }

// function App() {
// 	const [num, updateNum] = useState(0)
// 	useEffect(() => {
// 		console.log('App mount')
// 	}, [])

// 	useEffect(() => {
// 		console.log('num change create', num)
// 		return () => {
// 			console.log('num change destroy', num)
// 		}
// 	}, [num])

// 	return (
// 		<div onClick={() => updateNum(num + 1)}>
// 			{num === 0 ? <Child /> : 'noop'}
// 		</div>
// 	)
// }

// function Child() {
// 	useEffect(() => {
// 		console.log('Child mount')
// 		return () => console.log('Child unmount')
// 	}, [])

// 	return <>i am child</>
// }

function App() {
	return (
		<>
			<Child />
			<div>hello world</div>
		</>
	)
}

function Child() {
	return 'Child'
}

// ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
// 	<App />
// )

const root = ReactDOM.createRoot()

root.render(<App />)

window.root = root
