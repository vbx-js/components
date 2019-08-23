export function animate(el: HTMLElement, frames: Keyframe[] | PropertyIndexedKeyframes, duration = 500) {
    const animation = el.animate(frames, {
        easing: 'ease-in-out',
        duration
    })

    return {
        animation,
        promise: new Promise((resolve, reject) => {
            animation.onfinish = () => resolve()
            animation.oncancel = () => reject()
        })
    }
}

export function clip(val: number, def = 0) {
    return Math.max(0, parseFloat('' + val) || def) || def
}

const DisplayProperty = Symbol('vbx-original-display')

export function hide(el: HTMLElement) {
    if (!el)
        return
    const display = el.style.display
    if (display && display != 'none')
        el[DisplayProperty] = display
    el.style.display = 'none'
}

export function show(el: HTMLElement) {
    if (!el)
        return
    const display = el[DisplayProperty]
    if (el.style.display == 'none') {
        el.style.display = display || ''
    }
}

export function getComputedValue<T extends keyof CSSStyleDeclaration>(container: HTMLElement, cssProp: T) {
    return window.getComputedStyle(container, null)[cssProp]
}

export function eventKeys(...capture: Array<string | number>) {
    const codes = new Set(capture.filter(c => typeof c == 'string'))
    const keyCodes = new Set(capture.filter(c => typeof c == 'number'))
    return <T extends (event: KeyboardEvent) => any>(_target: Object, _key: string | symbol, descriptor: TypedPropertyDescriptor<T>) => {
        const old = descriptor.value
        descriptor.value = <any>function (event: KeyboardEvent) {
            if (codes.has(event.code) ||
                codes.has(event.key) ||
                // tslint:disable-next-line:deprecation
                keyCodes.has(event.keyCode)
            )
                return old.apply(this, arguments)
        }
        return descriptor
    }
}

export function debounce(waitMilliseconds = 50, isImmediate = false) {
    return <F extends () => Promise<any>>(_target: Object, _key: string | symbol, descriptor: TypedPropertyDescriptor<F>) => {
        let timeoutId: any
        let promise: Promise<ReturnType<F>>
        let resolve: (val: ReturnType<F>) => void
        let reject: (err: any) => void
        let that: any

        const func = descriptor.value
        const doLater = () => {
            timeoutId = undefined
            if (!isImmediate) {
                Promise.resolve(func.apply(that))
                    .then(resolve, reject)
            }
            promise = null
            resolve = null
            reject = null
        }

        descriptor.value = <any>function () {
            that = this
            if (timeoutId !== undefined) {
                clearTimeout(timeoutId)
            } else {
                promise = new Promise<ReturnType<F>>((res, rej) => {
                    resolve = res
                    reject = rej
                })
            }

            timeoutId = setTimeout(doLater, waitMilliseconds)

            if (isImmediate && timeoutId === undefined) {
                Promise.resolve(func.apply(that))
                    .then(resolve, reject)
            }
            return promise
        }
        return descriptor
    }
}
