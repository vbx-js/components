import { css, customElement, html, LitElement, property } from 'lit-element'
import { repeat } from 'lit-html/directives/repeat'
import ResizeObserver from 'resize-observer-polyfill'
import { animate, clip, debounce } from '../helpers/utils'
import '../icon/icon'
import { Inline, TAG_NAME as INLINE_TAG_NAME } from '../inline/inline'

export const DEFAULT_ITEM_WIDTH = 240

function slotName(index: number) {
    return `vbx-slider__item-${index}`
}

@customElement('vbx-slider')
export class Slider extends LitElement {

    static get styles() {
        return [css`:inline {
            content: './slider.scss';
        }`]
    }

    @property({ type: Boolean, reflect: true })
    single = false

    @property({ type: Number, reflect: true, attribute: 'item-width' })
    itemWidth: number = 240

    @property({ type: String, reflect: true })
    selector: string

    @property({ type: String, reflect: true, attribute: 'data-prev' })
    i18nPrev: string

    @property({ type: String, reflect: true, attribute: 'data-next' })
    i18nNext: string

    @property({ type: Number })
    private active: number = 0

    @property({ type: Number })
    private total: number = 0

    @property({ type: Number })
    private start: number = 0

    @property({ type: Number })
    private moving: number = 0

    @property({ type: Number })
    private pendingMove = 0

    @property({ type: Number })
    private cursorOffset = 0

    private get _itemWidth() {
        return Math.max(0, clip(this.itemWidth, DEFAULT_ITEM_WIDTH)) || DEFAULT_ITEM_WIDTH
    }

    private get _moveCount() {
        return Math.min(this.total, this.single ? 1 : this.active)
    }

    private get _start() {
        return this.moving > 0
            ? this.start
            : this.start + this.moving
    }

    private get _activeItems() {
        const start = this._start
        return this.total > 0
            ? new Array(this.active + Math.abs(this.moving)).fill(0).map((_v, i) => this._getIndex(start + i))
            : []
    }

    private _items = new Array<HTMLElement>()
    private _width: number
    private _resizeObserver = new ResizeObserver((changes) => {
        const c = (changes || []).find(c => c && c.target == this && c.contentRect.width != this._width)
        if (c) {
            this._width = c.contentRect.width
            this.recalculateCount()
        }
    })
    private _mutationObserver = new MutationObserver(() => this._updateChildren())

    private _startMoving = debounce(async (): Promise<void> => {
        if (!this.pendingMove || this.moving)
            return

        const move = this.total
            ? this.pendingMove % this.total
            : 0

        const content = this.$('.vbx-slider__content')
        let oldHeight = 0
        let newHeight = 0
        if (content) {
            oldHeight = content.getBoundingClientRect().height

            const start = this.start
            this.start = this._getIndex(this.start + move)

            await this.updateComplete

            newHeight = content.getBoundingClientRect().height
            const activeI = new Set(this._activeItems)
            this.recalculateCursorOffset()

            this.start = start

            await this.updateComplete

            new Array<Inline>()
                .concat(...this._items
                    .filter((_v, i) => !activeI.has(i))
                    .map(el => Array.from<Inline>(el.querySelectorAll(INLINE_TAG_NAME)))
                )
                .forEach(p => p.hide())
        }

        this.moving = move
        this.pendingMove = 0

        await this.updateComplete
        await this._animate(oldHeight, newHeight)
        await this.updateComplete
        if (this.pendingMove)
            return this._startMoving()
        return
    }, 200)

    $(selector: string) {
        return this.shadowRoot.querySelector(selector) as HTMLElement
    }

    recalculateCount() {
        const width = this.getBoundingClientRect().width
        const itemWidth = this._itemWidth

        const visible = Math.max(1, Math.round(width / itemWidth))
        if (visible >= this.total)
            this.active = visible
        else
            this.active = Math.max(1, Math.round((width - 96) / itemWidth))
    }

    recalculateCursorOffset() {
        const targets = Array.from(this.selector
            ? this.querySelectorAll(this.selector)
            : this.children
        )
        const midpoints = targets
            .map(el => {
                const rect = el.getBoundingClientRect()
                if (rect.height || rect.width)
                    return (rect.top + rect.bottom) / 2
                else
                    return undefined
            })
            .filter(mid => mid !== undefined)

        if (midpoints.length < 1)
            return

        const midpoint = midpoints.reduce((t, v) => t + v, 0) / midpoints.length
        const top = this.getBoundingClientRect().top
        this.cursorOffset = midpoint - top
    }

    async prev() {
        const move = -this._moveCount
        this.pendingMove += move
        return this._startMoving()
    }

    async next() {
        const move = this._moveCount
        this.pendingMove += move
        return this._startMoving()
    }

    private async _animate(oldHeight?: number, newHeight?: number) {
        const content = this.$('.vbx-slider__content')
        if (!this.moving || !content)
            return null

        const from: Keyframe = {}
        const to: Keyframe = {}
        const step = this.moving / (this.active + Math.abs(this.moving))

        if (this.moving > 0) {
            from.transform = `translate(0%)`
            to.transform = `translate(${-100 * step}%)`
        } else {
            from.transform = `translate(${100 * step}%)`
            to.transform = `translate(0%)`
        }

        const d = 15 * this._itemWidth * Math.abs(step)
        const promises = []
        promises.push(animate(content, [
            from,
            to
        ], d).promise)

        content.style.transform = to['transform'] + ''

        const wrap = this.$('.vbx-slider__wrap')
        if (wrap && oldHeight != newHeight && (oldHeight || newHeight)) {
            promises.push(animate(wrap, [
                {
                    height: `${oldHeight}px`
                },
                {
                    height: `${newHeight}px`
                }
            ], d).promise)

            wrap.style.height = `${newHeight}px`
        }

        await Promise.all(promises)
        this.start = this._getIndex(this.start + this.moving)
        this.moving = 0

        await this.updateComplete

        content.style.transform = ''
    }

    /**
     * Assign each child element to a slot
     */
    private _updateChildren() {
        this._items = Array.from<HTMLElement>(<any>this.children)
        this._items
            .forEach((el, i) => el.slot = slotName(i))
        this.total = this._items.length
    }

    private _getIndex(val: number) {
        if (this.total < 1)
            return 0

        val = val % this.total
        if (val < 0)
            val += this.total

        return val
    }

    render() {
        const items = this._activeItems

        const cursors = this.active && this.active < this.total
        return html`
            ${cursors ? html`<div class="vbx-slider__prev" @click="${this.prev}" title="${this.i18nPrev || 'Previous'}" rel=prev><vbx-icon shape="angle" direction="left" style="top: ${this.cursorOffset}px;"></vbx-icon></div>` : ''}
            <div class="vbx-slider__wrap">
                <ul class="vbx-slider__content" style="width: ${100 * items.length / this.active}%">
                    ${repeat(items, i => i, i => html`<li style="flex-basis: ${this._itemWidth}px; max-width: calc(${100 / items.length}% - 24px);"><slot name="${slotName(i)}"></slot></li>`)}
                </ul>
            </div>
            ${cursors ? html`<div class="vbx-slider__next" @click="${this.next}" title="${this.i18nNext || 'Next'}" rel="next"><vbx-icon shape="angle" direction="right" style="top: ${this.cursorOffset}px;"></vbx-icon></div>` : ''}
        `
    }

    connectedCallback() {
        super.connectedCallback()
        this._resizeObserver.observe(this)
        this._mutationObserver.observe(this, {
            childList: true
        })
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        this._resizeObserver.disconnect()
        this._mutationObserver.disconnect()
    }

    update(changedProps: Map<string | number | symbol, unknown>) {
        if (changedProps.has('itemWidth'))
            this.recalculateCount()
        return super.update(changedProps)
    }

    updated(changedProps: Map<string | number | symbol, unknown>) {
        if (changedProps.has('selector') || changedProps.has('active') || changedProps.has('total'))
            this.recalculateCursorOffset()
        return super.updated(changedProps)
    }

    firstUpdated() {
        this._updateChildren()
        this.recalculateCount()
        this.recalculateCursorOffset()
        setTimeout(async () => {
            await this.updateComplete
            this.recalculateCursorOffset()
        }, 10)
    }
}
