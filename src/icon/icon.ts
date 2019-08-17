import { css, customElement, html, LitElement, property, svg } from 'lit-element';

@customElement('vbx-icon')
export class Icon extends LitElement {

    static get styles() {
        return [css`:inline {
            content: './icon.scss';
        }`]
    }

    @property({ type: String, reflect: true })
    shape: string

    render() {
        return html`
            <svg display="none" xmlns="http://www.w3.org/2000/svg">
                <symbol id="close" style="width:24px;height:24px" viewBox="0 0 24 24" id=".8066955455236873">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                </symbol>
            </svg>
            <svg class="${this.shape}" xmlns:xlink="http://www.w3.org/1999/xlink">
                ${svg`<use fill="currentColor" href="${'#' + this.shape}"></use>`}
            </svg>
        `
    }
}
