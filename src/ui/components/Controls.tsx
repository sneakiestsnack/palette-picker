import { PALETTE_SIZE_MAX, PALETTE_SIZE_MIN } from '../../core';
import { actions } from '../../state/actions';
import { useApp } from '../../state/AppProvider';
import { STRINGS, rangeText } from '../strings';
import { RangeSlider, Slider } from './Slider';

export function Controls() {
  const { state, dispatch } = useApp();
  const { size, variety, hueWeight, valueRange } = state.controls;
  return (
    <div>
      <Slider
        label={STRINGS.COLORS}
        value={size}
        lo={PALETTE_SIZE_MIN}
        hi={PALETTE_SIZE_MAX}
        testId="ctl-size"
        onChange={(v) => dispatch(actions.controlsChanged({ size: v }))}
      />
      <Slider
        label={STRINGS.VARIETY}
        value={variety}
        lo={0}
        hi={100}
        testId="ctl-variety"
        captions={STRINGS.VARIETY_CAPTIONS}
        onChange={(v) => dispatch(actions.controlsChanged({ variety: v }))}
      />
      <Slider
        label={STRINGS.HUE_WEIGHT}
        value={hueWeight}
        lo={0}
        hi={100}
        testId="ctl-hue"
        captions={STRINGS.HUE_WEIGHT_CAPTIONS}
        onChange={(v) => dispatch(actions.controlsChanged({ hueWeight: v }))}
      />
      <RangeSlider
        label={STRINGS.VALUE_RANGE}
        values={[valueRange.min, valueRange.max]}
        thumbLabels={STRINGS.RANGE_THUMBS}
        testId="ctl-range"
        valueText={rangeText(valueRange.min, valueRange.max)}
        histogram={state.image?.histogram}
        onChange={([min, max]) => dispatch(actions.controlsChanged({ valueRange: { min: min!, max: max! } }))}
      />
    </div>
  );
}
