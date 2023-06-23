/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  InstrumentationBase,
  isWrapped,
} from '@opentelemetry/sandbox-instrumentation';
import { Event } from '@opentelemetry/sandbox-api-events';
import { EventEmitter } from '@opentelemetry/sandbox-sdk-events';

import { VERSION } from './version';
import {
  ApplyCustomEventDataFunction,
  PageViewInstrumentationConfig,
} from './types';
/**
 * This class represents a document load plugin
 */

export class PageViewEventInstrumentation extends InstrumentationBase<unknown> {
  static readonly instrumentationName =
    '@opentelemetry/instrumentation-page-view';
  readonly component: string = 'page-view-event';
  readonly version: string = '1';
  moduleName = this.component;
  emitter: EventEmitter | null = null;
  oldUrl = location.href;
  applyCustomEventData: ApplyCustomEventDataFunction | undefined = undefined;

  /**
   *
   * @param config
   */
  constructor(config: PageViewInstrumentationConfig) {
    super(PageViewEventInstrumentation.instrumentationName, VERSION, config);
    this.emitter = new EventEmitter(
      PageViewEventInstrumentation.name,
      VERSION,
      'browser'
    );
    this.applyCustomEventData = config.applyCustomEventData;
    this._patchHistoryApi();
  }

  init() {}

  /**
   * callback to be executed when page is viewed
   */
  private _onPageView() {
    const pageViewEvent: Event = {
      name: 'page_view',
      data: {
        url: document.documentURI as string,
        referrer: document.referrer,
        title: document.title,
        type: 0,
      },
    };
    this._applyCustomEventData(pageViewEvent, this.applyCustomEventData);
    this.emitter?.emit(pageViewEvent);
  }

  /**
   * callback to be executed when page is viewed
   */
  private _onVirtualPageView(changeState: string | null | undefined) {
    const title = document.title;
    const referrer = this.oldUrl;
    // Dont emit an event if the route didn't change
    if (referrer === location.href) {
      return;
    }
    const vPageViewEvent: Event = {
      name: 'page_view',
      data: {
        'http.url': window.location.href,
        title,
        changeState: changeState || '',
        referrer,
        type: 1,
      },
    };
    this._applyCustomEventData(vPageViewEvent, this.applyCustomEventData);
    this.emitter?.emit(vPageViewEvent);
  }

  public _setEmitter(emitter: EventEmitter) {
    this.emitter = emitter;
  }

  /**
   * executes callback {_onDocumenContentLoaded } when the page is viewed
   */
  private _waitForPageLoad() {
    document.addEventListener('DOMContentLoaded', this._onPageView.bind(this));
  }

  /**
   * implements enable function
   */
  override enable() {
    // remove previously attached load to avoid adding the same event twice
    // in case of multiple enable calling.
    document.removeEventListener(
      'DOMContentLoaded',
      this._onPageView.bind(this)
    );
    this._waitForPageLoad();
  }

  /**
   * implements disable function
   */
  override disable() {
    document.removeEventListener(
      'DOMContentLoaded',
      this._onPageView.bind(this)
    );
  }

  /**
   * Patches the certain history api method
   */
  _patchHistoryMethod(changeState: string) {
    const plugin = this;
    return (original: any) => {
      return function patchHistoryMethod(this: History, ...args: unknown[]) {
        const result = original.apply(this, args);
        const url = location.href;
        const oldUrl = plugin.oldUrl;
        if (url !== oldUrl) {
          plugin._onVirtualPageView(changeState);
          plugin.oldUrl = location.href;
        }
        return result;
      };
    };
  }

  private _patchHistoryApi(): void {
    this._unpatchHistoryApi();

    this._wrap(
      history,
      'replaceState',
      this._patchHistoryMethod('replaceState')
    );
    this._wrap(history, 'pushState', this._patchHistoryMethod('pushState'));
  }
  /**
   * unpatch the history api methods
   */
  _unpatchHistoryApi() {
    if (isWrapped(history.replaceState)) this._unwrap(history, 'replaceState');
    if (isWrapped(history.pushState)) this._unwrap(history, 'pushState');
  }

  /**
   *
   * @param logRecord
   * @param applyCustomLogAttributes
   * Add custom attributes to the log record
   */
  _applyCustomEventData(
    event: Event,
    applyCustomEventData: ApplyCustomEventDataFunction | undefined
  ) {
    if (applyCustomEventData) {
      applyCustomEventData(event);
    }
  }
}
