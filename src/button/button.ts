import { customElement, html, LitElement, property } from 'lit-element';
import { clip } from '../helpers/utils';
import { DEFAULT_HEIGHT, DEFAULT_WIDTH, Overlay, TAG_NAME as OVERLAY_TAG_NAME } from '../overlay/overlay';

@customElement('vbx-button')
export class Button extends LitElement {

    @property({ type: Number, reflect: true })
    maxWidth: number

    @property({ type: Number, reflect: true })
    maxHeight: number

    @property({ type: String, reflect: true })
    src: string

    @property({ type: String, reflect: true })
    description: string

    async openPlayer() {
        const instance = this._getPlayerInstance()
        await instance.hide()
        instance.src = this.src
        instance.description = this.description
        instance.maxWidth = clip(this.maxWidth, DEFAULT_WIDTH)
        instance.maxHeight = clip(this.maxHeight, DEFAULT_HEIGHT)

        const rect = this.getBoundingClientRect()

        return instance.show({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            w: rect.width,
            h: rect.height
        })
    }

    private _getPlayerInstance() {
        let instance = <Overlay>document.querySelector(OVERLAY_TAG_NAME)
        if (!instance) {
            instance = new Overlay()
            document.body.appendChild(instance)
        }
        return instance
    }

    render() {
        return html`
            <style>
                :host {
                    display: inline-block;
                    cursor: pointer;
                }
            </style>
            <div @click="${() => this.openPlayer()}">
                <slot></slot>
            </div>
        `
    }
}
