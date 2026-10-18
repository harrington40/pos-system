import { ServiceUnavailableException } from '@nestjs/common';
import { StrokeFeatureGuard } from './stroke-feature.guard';

describe('StrokeFeatureGuard', () => {
  afterEach(() => {
    delete process.env.STROKE_CARE_ENABLED;
  });

  it('keeps the feature enabled when no rollout flag is set', () => {
    expect(new StrokeFeatureGuard().canActivate()).toBe(true);
  });

  it('blocks every stroke route when production disables the feature', () => {
    process.env.STROKE_CARE_ENABLED = 'false';
    expect(() => new StrokeFeatureGuard().canActivate()).toThrow(
      ServiceUnavailableException,
    );
  });

  it('enables the feature only for the explicit true/undefined states', () => {
    process.env.STROKE_CARE_ENABLED = 'true';
    expect(new StrokeFeatureGuard().canActivate()).toBe(true);
  });
});
