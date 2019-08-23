import { css, customElement, html, LitElement, property } from 'lit-element'

@customElement('vbx-trigger')
export class Trigger extends LitElement {

    static get styles() {
        return [css`:inline {
            content: './trigger.scss';
        }`]
    }

    @property({ type: Boolean, reflect: true })
    small = false

    render() {
        return html`<slot></slot><div class="vbx-trigger__button"><vbx-icon shape="play"></vbx-icon></div>`
    }
}
