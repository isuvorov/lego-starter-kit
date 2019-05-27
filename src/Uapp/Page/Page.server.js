import map from 'lodash/map';
import ReactDOM from 'react-dom/server';
import renderPreloader from '@lskjs/general/Loading/renderPreloader';
import BasePage from './Page.client';

export default class Page extends BasePage {
  renderOGMeta() {
    const { meta = {} } = this.state;
    return `\
${meta.title ? `<meta property="og:title" content="${meta.title}" />` : ''}
${meta.description ? `<meta property="og:description" content="${meta.description}" />` : ''}
${meta.url ? `<meta property="og:url" content="${meta.url}" />` : ''}
${meta.image ? `<meta property="og:image" content="${meta.image}" />` : ''}
`;
  }

  // renderFavicon = require('./renderFavicon').default
  getRootState() {
    return this.uapp.rootState;
  }

  renderHead() {
    const renderFavicon = this.renderFavicon || require('./renderFavicon').default;
    // console.log('renderFavicon', this.renderFavicon);
    const js = this.renderJS();
    return `\
<title>${this.renderTitle()}</title>
${this.renderMeta()}
${this.renderShims()}
${renderFavicon()}
${this.renderOGMeta()}
${this.renderAssets('css')}
${this.renderStyle()}
${!js ? '' : `<script>${js}</script>`}
${this.renderPreloader()} 
`;
  }

  renderPreloader() {
    return renderPreloader();
  }

  renderMeta() {
    const { meta = {} } = this.state;
    return `\
<meta charset="utf-8">
<meta http-equiv="x-ua-compatible" content="ie=edge" />
<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1., maximum-scale=1." />
${meta.description ? `<meta name="description" content="${meta.description}"/>` : ''}

`;
  }
  renderShims() {
    return `\
<!--[if lt IE 9]>
  <script src="https://oss.maxcdn.com/html5shiv/3.7.3/html5shiv.min.js"></script>
  <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
<![endif]-->
`;
  }

  getHtmlClass() {
    const ua = {};// useragent.is(req.headers['user-agent'])
    ua.js = false;
    ua.touchable = false;

    const postfix = __DEV__ ? ' __DEV__' : '';
    return (map(ua, (val, key) => `ua_${key}_${val ? 'yes' : 'no'}`).join(' ') || '') + postfix;
  }

  renderStyle() {
    const styles = this.uapp.styles || [];
    return `<style id="css">${(styles).join('\n')}</style>`;
  }


  renderJS() {
    if (__CLIENT__) return '';
    // window.__STAGE='${process.env.STAGE || 'develop'}';
    return `
      window.__VERSION='${__VERSION}';
      window.__STAGE='${__STAGE}';
      window.__INSTANCE='${__INSTANCE}';
      window.__MASTER=${__MASTER} || false;
    `;
  }

  renderChunks(type, chunk = 'client') {
    const props = this.uapp;
    if (!props || !props.assets) return '';
    // console.log('props.assets', props.assets);
    const assets = props.assets[chunk];
    if (type === 'css' && assets) {
      return assets
        .filter(filename => filename.includes('.css'))
        .map(filename => (
          `<link rel="stylesheet" href="${filename}">`
        ))
        .join('\n');
    }
    if (type === 'js' && assets) {
      return assets
        .filter(filename => filename.includes('.js'))
        .map(filename => (
          `<script id="js" src="${filename}"></script>`
        ))
        .join('\n');
    }
    return '';
  }

  renderAssets(type) {
    const props = this.uapp;
    if (!props || !props.assets) return '';
    if (type === 'css' && props.assets) {
      return `<link rel="stylesheet" href="${props.assets['client.css']}">`;
    }
    if (type === 'js' && props.assets) {
      return `<script id="js" src="${props.assets['client.js']}"></script>`;
    }
    return '';
  }

  renderDebug() {
    const util = require('util');
    return `<!--
DEBUG INFO

__SERVER__: ${__SERVER__}
__DEV__: ${__DEV__}
__STAGE: ${__STAGE}

uapp.keys: ${Object.keys(this.uapp)}
uapp.config:
${util.inspect(this.uapp.config)}
uapp.page.state:
${util.inspect(this.uapp.page.state)}
-->`;
  }

  renderFooter() {
    return `\
${__DEV__ ? this.renderDebug() : ''}
${this.state.footerHtml || ''}
${this.footer || ''}
`;
  }

  renderHtml() {
    let root;
    let rootDom;
    try {
      rootDom = this.renderRoot();
      root = ReactDOM.renderToStaticMarkup(rootDom); // because async style render
    } catch (err) {
      const text = ['Error', 'Page.renderHtml', 'ReactDOM.renderToStaticMarkup', ''].join(':\n');
      console.error(text, err);
      // __DEV__ && console.log(err);
      if (__DEV__) {
        return `<pre>${text}${err.stack}</pre>`;
      }
      return err.message;
    }
    return `\
  <!doctype html>
  <html class="${this.getHtmlClass()}">
    <head>
      ${this.renderHead()}
    </head>
    <body>
      <div id="root"/>
        ${root}
      </div>
      <script>
        window.__ROOT_STATE__ = ${JSON.stringify(this.getRootState(), null, __DEV__ ? 4 : 0)};
      </script>
      ${this.renderAssets('js')}
      ${this.renderFooter()}
    </body>
  </html>
      `;
  }
}
