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

import { number } from '@storybook/addon-knobs';
import React from 'react';

import { Chart, Datum, Partition } from '../../src';
import { config } from '../../src/chart_types/partition_chart/layout/config/config';
import { mocks } from '../../src/mocks/hierarchical';
import { indexInterpolatedFillColor, interpolatorTurbo, productLookup } from '../utils/utils';

export const Example = () => (
  <Chart className="story-chart">
    <Partition
      id="spec_1"
      data={mocks.pie}
      valueAccessor={(d: Datum) => d.exportVal as number}
      valueFormatter={(d: number) => `$${config.fillLabel.valueFormatter(Math.round(d / 1000000000))}\u00A0Bn`}
      layers={[
        {
          groupByRollup: (d: Datum) => d.sitc1,
          nodeLabel: (d: Datum) => productLookup[d].name,
          fillLabel: {
            textInvertible: true,
            fontWeight: 100,
            fontStyle: 'italic',
            valueFont: {
              fontFamily: 'Menlo',
              fontStyle: 'normal',
              fontWeight: 900,
            },
          },
          shape: {
            fillColor: indexInterpolatedFillColor(interpolatorTurbo),
          },
        },
      ]}
      config={{
        outerSizeRatio: 0.9,
        linkLabel: {
          fontStyle: 'italic',
          valueFont: { fontWeight: 900 },
          maxTextLength: number('maxTextLength', 20, { range: true, min: 1, max: 100 }),
        },
      }}
    />
  </Chart>
);
