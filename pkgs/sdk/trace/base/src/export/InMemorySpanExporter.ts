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

import { SpanExporter } from './SpanExporter';
import { ReadableSpan } from './ReadableSpan';
import { ExportResult, ExportResultCode } from '@opentelemetry/sandbox-core';

/**
 * This class can be used for testing purposes. It stores the exported spans
 * in a list in memory that can be retrieved using the `getFinishedSpans()`
 * method.
 */
export class InMemorySpanExporter implements SpanExporter {
  private _finishedSpans: ReadableSpan[] = [];
  /**
   * Indicates if the exporter has been "shutdown."
   * When false, exported spans will not be stored in-memory.
   */
  protected _stopped = false;

  export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void
  ): void {
    if (this._stopped)
      return resultCallback({
        code: ExportResultCode.FAILED,
        error: new Error('Exporter has been stopped'),
      });
    this._finishedSpans.push(...spans);

    setTimeout(() => resultCallback({ code: ExportResultCode.SUCCESS }), 0);
  }

  shutdown(): Promise<void> {
    this._stopped = true;
    this._finishedSpans = [];
    return Promise.resolve();
  }

  reset(): void {
    this._finishedSpans = [];
  }

  getFinishedSpans(): ReadableSpan[] {
    return this._finishedSpans;
  }
}
