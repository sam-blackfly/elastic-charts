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

import createCachedSelector from 're-reselect';

import { TooltipInfo } from '../../../../components/tooltip/types';
import { TooltipType, getTooltipType } from '../../../../specs';
import { GlobalChartState, PointerStates } from '../../../../state/chart_state';
import { getChartIdSelector } from '../../../../state/selectors/get_chart_id';
import { getSettingsSpecSelector } from '../../../../state/selectors/get_settings_specs';
import { Point } from '../../../../utils/point';
import { getProjectedPointerPositionSelector } from './get_projected_pointer_position';
import { getTooltipInfoSelector } from './get_tooltip_values_highlighted_geoms';
import { isAnnotationTooltipVisibleSelector } from './is_annotation_tooltip_visible';

const hasTooltipTypeDefinedSelector = (state: GlobalChartState): TooltipType | undefined => getTooltipType(getSettingsSpecSelector(state));

const getPointerSelector = (state: GlobalChartState) => state.interactions.pointer;

/** @internal */
export const isTooltipVisibleSelector = createCachedSelector(
  [
    hasTooltipTypeDefinedSelector,
    getPointerSelector,
    getProjectedPointerPositionSelector,
    getTooltipInfoSelector,
    isAnnotationTooltipVisibleSelector,
  ],
  isTooltipVisible,
)(getChartIdSelector);

function isTooltipVisible(
  tooltipType: TooltipType | undefined,
  pointer: PointerStates,
  projectedPointerPosition: Point,
  tooltip: TooltipInfo,
  isAnnotationTooltipVisible: boolean,
) {
  return (
    tooltipType !== TooltipType.None
    && pointer.down === null
    && projectedPointerPosition.x > -1
    && projectedPointerPosition.y > -1
    && tooltip.values.length > 0
    && !isAnnotationTooltipVisible
  );
}
