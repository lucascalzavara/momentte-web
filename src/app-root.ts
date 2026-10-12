import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import './components/site-header'
import './components/site-footer'
import './pages/home-page'
@customElement('app-root')
export class AppRoot extends LitElement {
 protected createRenderRoot() { return this }
 render() { return html`<site-header></site-header><home-page></home-page><site-footer></site-footer>` }
}
