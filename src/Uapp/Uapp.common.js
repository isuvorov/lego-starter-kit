import map from 'lodash/map';
import get from 'lodash/get';
import UniversalRouter from 'universal-router';
import Api from 'apiquery';
import cloneDeep from 'lodash/cloneDeep';
import forEach from 'lodash/forEach';
import autobind from 'core-decorators/lib/autobind';
import { observable } from 'mobx';
import scrollTo from '@lskjs/general/utils/scrollTo';
import detectHtmlClasses from '@lskjs/general/utils/detectHtmlClasses';
import addClassToHtml from '@lskjs/general/utils/addClassToHtml';
import removeClassFromHtml from '@lskjs/general/utils/removeClassFromHtml';
import Root from '@lskjs/general/Root';
import I18 from '@lskjs/i18';
import logger from '../Core/logger';

import Core from '../Core';

global.DEV = () => null;

export default class Uapp extends Core {
  name = 'Uapp';
  Api = Api;
  Page = require('./Page').default;
  pageProps = {};
  // Root = require('./Root').default;
  Root = Root;
  theme = require('./theme').default;
  scrollTo = scrollTo;
  i18 = new I18({ ctx: this });


  createLogger(params) {
    const level = __DEV__ ? ( // eslint-disable-line no-nested-ternary
      __SERVER__ ? 'warn' : 'trace'
    ) : 'error';

    return logger.createLogger({
      name: this.name || 'app',
      src: __DEV__,
      level,
      ...get(this, 'config.log', {}),
      ...params,
    });
  }

  async init() {
    await super.init();
    this.config = this.getConfig();
    this.initConfig = cloneDeep(this.config); // подумать в init или в run

    this.stores = this.getStores();
    await this.initSession();


    // TODO: прокинуть домен (req) когда сервер
    this.api = this.getApi();
    if (this.i18) {
      await this.i18.setState({
        log: this.log,
        config: this.app.config.i18,
        getLocale: this.getLocale,
      }).init();
    }
  }

  getApi() {
    const apiConfig = (this.config && this.config.api || {});

    const url = get(apiConfig, 'url', __CLIENT__ ? '/' : `http://127.0.0.1:${this.app.config.port}`);
    const api = new this.Api({
      ...apiConfig,
      url,
    });

    return api;
  }

  getLocale = require('./i18/getLocale').default
  setLocale = require('./i18/setLocale').default

  @autobind
  t(...args) {
    // console.log('DEPRECATED uapp.t', args[0]);
    if (this.i18) return this.i18.t(...args);
    return '!uapp.i18';
  }

  async initSession() {
    const { UserStore, AuthStore } = this.stores;

    this.user = new UserStore(this.rootState.user);
    this.auth = new AuthStore();
  }

  getStores() {
    return require('./stores').default();
  }

  async started() {
    super.started();
    console.log('STARTED');
  }
  async run() {
    await super.run();
    const context = this.provide();
    this.log.trace('router.context', Object.keys(context));
    this.routes = this.getRoutes();
    this.router = new UniversalRouter(this.routes, {
      context,
    });
    await this.lazyRun();
    if (__CLIENT__) {
      console.log('RUNNED');
      setTimeout(() => {
        const classes = detectHtmlClasses();
        classes.forEach(addClassToHtml);
        removeClassFromHtml('ua_js_no');
        addClassToHtml('ua_js_yes');
      }, 100);
    }
  }


  async lazyRun() {
    await this.auth.init();
    await this.reconnect();
    // await this.initStateStorage();
    // await super.run();
  }


  async reconnect() {
    // await this.auth.reconnect();
    // await this.initStateStorage();
  }


  // ////////////////////
  @observable state2 = {
    testInput: '',
    locale: '',
    helpers: {},
  };
  async setState(data = {}, params = {}) {
    const { ws, localStorage, appstate } = {
      appstate: true,
      ws: true,
      localStorage: true,
      ...params,
    };
    // console.log({ data });
    if (appstate) {
      forEach(data, (value, key) => {
        this.state2[key] = value;
      });
    }
    if (__CLIENT__) {
      // Object.assign(this.state2, data);
      if (localStorage) {
        window.localStorage.setItem('appstate', JSON.stringify(this.state2));
      }
      if (ws) {
        // TODO: websockets
        const state = await this.api.fetch('/api/module/appstate/save', {
          method: 'POST',
          body: {
            userId: this.user?._id,
            ...data,
            // state: data,
          },
        });
        this.setState(state.data, {
          ws: false,
        });
        // forEach(state, (value, key) => {
        //   this.state2[key] = value;
        // });
        // this.setState(state);
      }
    }
  }

  async initStateStorage() {
    // if (__CLIENT__) {
    // this.state = storedObservable('uappState', this.state, 500);
    // this.state = storedObservable('uappState', this.state, 100);
    // console.log('initStateStorage');
    // let storageData = {};
    // let state = {};
    // state = {
    //   ...state,
    //   ...(this.rootState.appstate || {}),
    // };
    // if (__CLIENT__) {
    //   try {
    //     storageData = JSON.parse(window.localStorage.getItem('appstate'));
    //     state = {
    //       ...state,
    //       ...storageData,
    //     };
    //   } catch (err) {
    //     console.error("Uapp.initStateStorage: JSON.parse(window.localStorage.getItem('appstate'))", err); // eslint-disable-line
    //   }
    // }

    let state = {};
    const userId = this.user?._id;
    if (userId) {
      // console.log('-- 1111');
      // console.log('-- 1111', this.api);
      const res = await this.api.fetch('/api/module/appstate/getOrCreate', {
        qs: {
          userId,
        },
      }).catch(err => this.log.error('Uapp.initStateStorage: getOrCreate', err));
      // console.log('-- 2222');
      if (res?.data) {
        state = {
          ...state,
          ...res.data,
        };
      }
    }
    // const updates = {
    //   appstate: true,
    //   ws: false,
    //   localstorage: true,
    // };

    // con
    // if (!DB) {
    //   updates.ws = true;
    // }

    this.setState(state, {
      ws: false,
      localstorage: false,
    });
    // console.log('initStateStorage /api/module/appstate/get', { data: res?.data });


    // if (__CLIENT__) this.setState();
    // autorun(() => {
    //   if (__DEV__ || __CLIENT__) {
    //     // console.log('uapp.state was updated, helpers.dashboard=', this.state.helpers?.dashboard);
    //   }
    //   // console.log(sum.get())
    // }, { delay: 100 });
    // }
  }


  url(str, params = null) {
    let query = '';
    if (params) {
      query = `?${map(params, (val, key) => `${key}=${val}`).join('&')}`;
    }
    return `${this.config.url || ''}${str}${query}`;
  }


  state = {
    secret: false,
  };

  // uapp.onError(t('common.errorData'), err); ??? // bad
  // uapp.onError(uapp.e('errorData', { err })); ???
  @autobind
  onError(err) {
    return this.toast(err, { defaultType: 'error' });
  }


  toast(err, config) {
    // console.log('toast', err, this.notificationSystem);
    if (this.notificationSystem && this.notificationSystem.current) {
      this.notificationSystem.current.toast(err, config);
    } else {
      console.error('Uapp.toast', err);
    }
  }

  confirm(props) {
    return this.confirmRef?.open(props);
  }


  getConfig() {
    const { config } = this;
    return config;
  }

  getRoutes() {
    return {};
  }

  async resetPage() {
    // console.log('resetPage');
    if (!this.page) {
      this.page = new this.Page(this.pageProps || {});
    } else {
      await this.page.exit();
    }
    await this.page.init({
      Root: this.Root,
      uapp: this,
      state: {},
    });
    return this.page;
  }

  async resolve(reqParams = {}) {
    const req = Api.createReq(reqParams);
    this.emit('resolve:before', { req, reqParams });
    __CLIENT__ && __DEV__ && this.log.trace('Uapp.resolve', req.path, req.query);
    await this.resetPage();
    try {
      await this.router.resolve({
        pathname: reqParams.path,
        path: reqParams.path,
        query: reqParams.query,
        req,
        page: this.page,
      });
    } catch (err) {
      console.error('uapp.router.resolve err', err); //eslint-disable-line
      this.log.error('resolveErr', err);
    }
    this.emit('resolve:after', { req, reqParams });
  }

  refresh() {
    if (__CLIENT__) {
      // window.location.reload();
      this.app.render();
    }
  }

  redirect(path) {
    __DEV__ && console.log('Uapp.redirect', path);
    if (__CLIENT__) {
      this.app.redirect(path);
    } else {
      __DEV__ && console.log('cant history.redirect because it server', path);
    }
  }

  restart() {

  }

  provide() {
    return {
      uapp: this,
      log: this.log,
      config: this.config,
      page: this.page,
      rootState: this.rootState,
      state: this.state, // appState

      api: this.api,
      auth: this.auth,
      user: this.user,

      i18: this.i18,
      t: this.t,
      // locale: this.locale,
      theme: this.theme,
    };
  }
}

