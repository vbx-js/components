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
