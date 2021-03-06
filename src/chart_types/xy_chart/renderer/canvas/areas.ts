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

import { LegendItem } from '../../../../commons/legend';
import { Rect } from '../../../../geoms/types';
import { withClip, withContext } from '../../../../renderers/canvas';
import { AreaGeometry } from '../../../../utils/geometry';
import { SharedGeometryStateStyle } from '../../../../utils/themes/theme';
import { getGeometryStateStyle } from '../../rendering/rendering';
import { renderPoints } from './points';
import { renderLinePaths, renderAreaPath } from './primitives/path';
import { buildAreaStyles } from './styles/area';
import { buildLineStyles } from './styles/line';

interface AreaGeometriesProps {
  areas: AreaGeometry[];
  sharedStyle: SharedGeometryStateStyle;
  highlightedLegendItem: LegendItem | null;
  clippings: Rect;
}

/** @internal */
export function renderAreas(ctx: CanvasRenderingContext2D, props: AreaGeometriesProps) {
  withContext(ctx, (ctx) => {
    const { sharedStyle, highlightedLegendItem, areas, clippings } = props;

    withClip(ctx, clippings, (ctx: CanvasRenderingContext2D) => {
      ctx.save();

      // eslint-disable-next-line no-restricted-syntax
      for (const glyph of areas) {
        const { seriesAreaLineStyle, seriesAreaStyle } = glyph;
        if (seriesAreaStyle.visible) {
          withContext(ctx, () => {
            renderArea(ctx, glyph, sharedStyle, highlightedLegendItem, clippings);
          });
        }
        if (seriesAreaLineStyle.visible) {
          withContext(ctx, () => {
            renderAreaLines(ctx, glyph, sharedStyle, highlightedLegendItem, clippings);
          });
        }
      }
      ctx.rect(clippings.x, clippings.y, clippings.width, clippings.height);
      ctx.clip();
      ctx.restore();
    });

    areas.forEach((area) => {
      const { seriesPointStyle, seriesIdentifier } = area;
      if (seriesPointStyle.visible) {
        const geometryStateStyle = getGeometryStateStyle(seriesIdentifier, highlightedLegendItem, sharedStyle);
        withClip(
          ctx,
          clippings,
          (ctx) => {
            renderPoints(ctx, area.points, seriesPointStyle, geometryStateStyle);
          },
          // TODO: add padding over clipping
          area.points[0]?.value.mark !== null,
        );
      }
    });
  });
}

function renderArea(
  ctx: CanvasRenderingContext2D,
  glyph: AreaGeometry,
  sharedStyle: SharedGeometryStateStyle,
  highlightedLegendItem: LegendItem | null,
  clippings: Rect,
) {
  const { area, color, transform, seriesIdentifier, seriesAreaStyle, clippedRanges } = glyph;
  const geometryStateStyle = getGeometryStateStyle(seriesIdentifier, highlightedLegendItem, sharedStyle);
  const fill = buildAreaStyles(color, seriesAreaStyle, geometryStateStyle);
  renderAreaPath(ctx, transform.x, area, fill, clippedRanges, clippings);
}

function renderAreaLines(
  ctx: CanvasRenderingContext2D,
  glyph: AreaGeometry,
  sharedStyle: SharedGeometryStateStyle,
  highlightedLegendItem: LegendItem | null,
  clippings: Rect,
) {
  const { lines, color, seriesIdentifier, transform, seriesAreaLineStyle, clippedRanges } = glyph;
  const geometryStateStyle = getGeometryStateStyle(seriesIdentifier, highlightedLegendItem, sharedStyle);
  const stroke = buildLineStyles(color, seriesAreaLineStyle, geometryStateStyle);
  renderLinePaths(ctx, transform.x, lines, stroke, clippedRanges, clippings);
}
