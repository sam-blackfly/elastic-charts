/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ScaleType } from '../../../scales';
import { isDefined } from '../state/utils';
import { DataSeries, DataSeriesDatum, RawDataSeries, RawDataSeriesDatum, FilledValues } from './series';

/** @internal */
export interface StackedValues {
  values: number[];
  percent: Array<number>;
  total: number;
}

/** @internal */
export const datumXSortPredicate = (xScaleType: ScaleType) => (a: DataSeriesDatum, b: DataSeriesDatum) => {
  if (xScaleType === ScaleType.Ordinal || typeof a.x === 'string' || typeof b.x === 'string') {
    return 0;
  }
  return a.x - b.x;
};

/**
 * Map each y value from a RawDataSeries on it's specific x value into,
 * ordering the stack based on the dataseries index.
 * @param dataseries
 * @internal
 */
export function getYValueStackMap(
  dataseries: RawDataSeries[],
  xValues: Set<string | number>,
): Map<string | number, number[]> {
  const stackMap = new Map<string | number, number[]>();
  const missingXValues = new Set([...xValues]);
  dataseries.forEach((ds, index) => {
    ds.data.forEach((datum) => {
      const stack = stackMap.get(datum.x) || new Array(dataseries.length).fill(0);
      stack[index] = datum.y1;
      stackMap.set(datum.x, stack);
      if (xValues.has(datum.x)) {
        missingXValues.delete(datum.x);
      }
    });
    // eslint-disable-next-line no-restricted-syntax
    for (const x of missingXValues.values()) {
      const stack = stackMap.get(x) || new Array(dataseries.length).fill(0);
      // currently filling as 0 value
      stack[index] = 0;
      stackMap.set(x, stack);
    }
  });
  return stackMap;
}

/**
 * For each key of the yValueStackMap, it stacks the values one after the other,
 * summing the previous value to the next one.
 * @param yValueStackMap
 * @param scaleToExtent
 * @internal
 */
export function computeYStackedMapValues(
  yValueStackMap: Map<any, number[]>,
  scaleToExtent: boolean,
): Map<any, StackedValues> {
  const stackedValues = new Map<any, StackedValues>();

  yValueStackMap.forEach((yStackArray, xValue) => {
    const stackArray = yStackArray.reduce(
      (acc, currentValue, index) => {
        if (acc.values.length === 0) {
          if (scaleToExtent) {
            return {
              values: [currentValue, currentValue],
              total: currentValue,
            };
          }
          return {
            values: [0, currentValue],
            total: currentValue,
          };
        }
        return {
          values: [...acc.values, acc.values[index] + currentValue],
          total: acc.total + currentValue,
        };
      },
      {
        values: [] as number[],
        total: 0,
      },
    );
    const percent = stackArray.values.map((value) => {
      if (stackArray.total === 0) {
        return 0;
      }
      return value / stackArray.total;
    });
    stackedValues.set(xValue, {
      values: stackArray.values,
      percent,
      total: stackArray.total,
    });
  });
  return stackedValues;
}

/** @internal */
export function formatStackedDataSeriesValues(
  dataseries: RawDataSeries[],
  scaleToExtent: boolean,
  isPercentageMode: boolean,
  xValues: Set<string | number>,
  xScaleType: ScaleType,
): DataSeries[] {
  const yValueStackMap = getYValueStackMap(dataseries, xValues);
  const stackedValues = computeYStackedMapValues(yValueStackMap, scaleToExtent);
  const stackedDataSeries: DataSeries[] = dataseries.map((ds, seriesIndex) => {
    const newData: DataSeriesDatum[] = [];
    const missingXValues = new Set([...xValues]);
    ds.data.forEach((data) => {
      const formattedSeriesDatum = getStackedFormattedSeriesDatum(
        data,
        stackedValues,
        seriesIndex,
        scaleToExtent,
        isPercentageMode,
      );
      if (formattedSeriesDatum === undefined) {
        return;
      }
      missingXValues.delete(data.x);
      newData.push(formattedSeriesDatum);
    });
    // eslint-disable-next-line no-restricted-syntax
    for (const x of missingXValues.values()) {
      const filledSeriesDatum = getStackedFormattedSeriesDatum(
        {
          x,
          // filling as 0 value
          y1: 0,
          mark: null,
          datum: null,
        },
        stackedValues,
        seriesIndex,
        scaleToExtent,
        isPercentageMode,
        {
          x,
          // filling as 0 value
          y1: 0,
        },
      );
      if (filledSeriesDatum) {
        newData.push(filledSeriesDatum);
      }
    }
    newData.sort(datumXSortPredicate(xScaleType));
    return {
      ...ds,
      data: newData,
    };
  });
  return stackedDataSeries;
}

/** @internal */
export function getStackedFormattedSeriesDatum(
  data: RawDataSeriesDatum,
  stackedValues: Map<any, StackedValues>,
  seriesIndex: number,
  scaleToExtent: boolean,
  isPercentageMode = false,
  filled?: FilledValues,
): DataSeriesDatum | undefined {
  const { x, mark: markValue, datum } = data;
  const stack = stackedValues.get(x);
  if (!stack) {
    return;
  }
  let y1: number | null = null;
  let y0: number | null | undefined = null;
  if (isPercentageMode) {
    if (data.y1 != null) {
      y1 = stack.total !== 0 ? data.y1 / stack.total : 0;
    }
    if (data.y0 != null) {
      y0 = stack.total !== 0 ? data.y0 / stack.total : 0;
    }
  } else {
    // eslint-disable-next-line prefer-destructuring
    y1 = data.y1;
    // eslint-disable-next-line prefer-destructuring
    y0 = data.y0;
  }

  let computedY0: number | null;
  if (scaleToExtent) {
    computedY0 = y0 || y1;
  } else {
    computedY0 = y0 || null;
  }
  const initialY0 = y0 == null ? null : y0;
  const mark = isDefined(markValue) ? markValue : null;

  if (seriesIndex === 0) {
    return {
      x,
      y1,
      y0: computedY0,
      initialY1: y1,
      initialY0,
      mark,
      datum,
      ...(filled && { filled }),
    };
  }
  const stackY = isPercentageMode ? stack.percent[seriesIndex] : stack.values[seriesIndex];
  let stackedY1: number | null = null;
  let stackedY0: number | null = null;
  if (isPercentageMode) {
    stackedY1 = y1 !== null && stackY != null ? stackY + y1 : null;
    stackedY0 = y0 != null && stackY != null ? stackY + y0 : stackY;
  } else {
    if (stackY == null) {
      stackedY1 = y1 !== null ? y1 : null;
      stackedY0 = y0 != null ? y0 : stackY;
    } else {
      stackedY1 = y1 !== null ? stackY + y1 : null;
      stackedY0 = y0 != null ? stackY + y0 : stackY;
    }
    // configure null y0 if y1 is null
    // it's semantically correct to say y0 is null if y1 is null
    if (stackedY1 === null) {
      stackedY0 = null;
    }
  }

  return {
    x,
    y1: stackedY1,
    y0: stackedY0,
    initialY1: y1,
    initialY0,
    mark,
    datum,
    ...(filled && { filled }),
  };
}
