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

import { millisToHrTime } from '@opentelemetry/sandbox-core';
import { AggregationTemporalitySelector } from '../export/AggregationSelector';
import { CollectionResult } from '../export/MetricData';
import { MetricProducer, MetricCollectOptions } from '../export/MetricProducer';
import { MetricReader } from '../export/MetricReader';
import { InstrumentType } from '../InstrumentDescriptor';
import { ForceFlushOptions, ShutdownOptions } from '../types';
import { FlatMap } from '../utils';
import { MeterProviderSharedState } from './MeterProviderSharedState';

/**
 * An internal opaque interface that the MetricReader receives as
 * MetricProducer. It acts as the storage key to the internal metric stream
 * state for each MetricReader.
 */
export class MetricCollector implements MetricProducer {
  constructor(
    private _sharedState: MeterProviderSharedState,
    private _metricReader: MetricReader
  ) {}

  async collect(options?: MetricCollectOptions): Promise<CollectionResult> {
    const collectionTime = millisToHrTime(Date.now());
    const meterCollectionPromises = Array.from(
      this._sharedState.meterSharedStates.values()
    ).map(meterSharedState =>
      meterSharedState.collect(this, collectionTime, options)
    );
    const result = await Promise.all(meterCollectionPromises);

    return {
      resourceMetrics: {
        resource: this._sharedState.resource,
        scopeMetrics: result.map(it => it.scopeMetrics),
      },
      errors: FlatMap(result, it => it.errors),
    };
  }

  /**
   * Delegates for MetricReader.forceFlush.
   */
  async forceFlush(options?: ForceFlushOptions): Promise<void> {
    await this._metricReader.forceFlush(options);
  }

  /**
   * Delegates for MetricReader.shutdown.
   */
  async shutdown(options?: ShutdownOptions): Promise<void> {
    await this._metricReader.shutdown(options);
  }

  selectAggregationTemporality(instrumentType: InstrumentType) {
    return this._metricReader.selectAggregationTemporality(instrumentType);
  }

  selectAggregation(instrumentType: InstrumentType) {
    return this._metricReader.selectAggregation(instrumentType);
  }
}

/**
 * An internal interface for MetricCollector. Exposes the necessary
 * information for metric collection.
 */
export interface MetricCollectorHandle {
  selectAggregationTemporality: AggregationTemporalitySelector;
}
