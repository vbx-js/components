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

export function debounce<F extends () => any>(func: F, waitMilliseconds = 50, isImmediate = false) {
    let timeoutId: any
    let promise: Promise<ReturnType<F>>
    let resolve: (val: ReturnType<F>) => void
    let reject: (err: any) => void

    const doLater = () => {
        timeoutId = undefined
        if (!isImmediate) {
            Promise.resolve(func())
                .then(resolve, reject)
        }
        promise = null
        resolve = null
        reject = null
    }

    return async () => {
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
            Promise.resolve(func())
                .then(resolve, reject)
        }
        return promise
    }
}
