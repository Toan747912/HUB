import { LifecycleState } from '../lifecycle-state';
import { assertValidLifecycleTransition, LifecycleTransitionError } from '../lifecycle-transition';

describe('assertValidLifecycleTransition', () => {
  const validPairs: Array<[LifecycleState, LifecycleState]> = [
    [LifecycleState.CREATED, LifecycleState.READY],
    [LifecycleState.CREATED, LifecycleState.STOPPED],
    [LifecycleState.READY, LifecycleState.RUNNING],
    [LifecycleState.READY, LifecycleState.STOPPED],
    [LifecycleState.RUNNING, LifecycleState.WAITING],
    [LifecycleState.RUNNING, LifecycleState.COMPLETED],
    [LifecycleState.RUNNING, LifecycleState.FAILED],
    [LifecycleState.RUNNING, LifecycleState.STOPPED],
    [LifecycleState.WAITING, LifecycleState.RUNNING],
    [LifecycleState.WAITING, LifecycleState.FAILED],
    [LifecycleState.WAITING, LifecycleState.STOPPED],
  ];

  it.each(validPairs)('allows %s -> %s', (from, to) => {
    expect(() => assertValidLifecycleTransition('instance-1', from, to)).not.toThrow();
  });

  const invalidPairs: Array<[LifecycleState, LifecycleState]> = [
    [LifecycleState.CREATED, LifecycleState.RUNNING],
    [LifecycleState.CREATED, LifecycleState.COMPLETED],
    [LifecycleState.READY, LifecycleState.CREATED],
    [LifecycleState.READY, LifecycleState.COMPLETED],
    [LifecycleState.RUNNING, LifecycleState.CREATED],
    [LifecycleState.RUNNING, LifecycleState.READY],
    [LifecycleState.WAITING, LifecycleState.CREATED],
    [LifecycleState.WAITING, LifecycleState.COMPLETED],
    [LifecycleState.FAILED, LifecycleState.RUNNING],
    [LifecycleState.COMPLETED, LifecycleState.RUNNING],
    [LifecycleState.STOPPED, LifecycleState.RUNNING],
  ];

  it.each(invalidPairs)('rejects %s -> %s', (from, to) => {
    expect(() => assertValidLifecycleTransition('instance-1', from, to)).toThrow(LifecycleTransitionError);
  });

  it('includes the instance id and both states on the thrown error', () => {
    try {
      assertValidLifecycleTransition('instance-42', LifecycleState.COMPLETED, LifecycleState.RUNNING);
      throw new Error('expected assertValidLifecycleTransition to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LifecycleTransitionError);
      const transitionError = error as LifecycleTransitionError;
      expect(transitionError.instanceId).toBe('instance-42');
      expect(transitionError.from).toBe(LifecycleState.COMPLETED);
      expect(transitionError.to).toBe(LifecycleState.RUNNING);
      expect(transitionError.message).toContain('instance-42');
    }
  });

  it('terminal states have no outgoing transitions', () => {
    for (const terminal of [LifecycleState.FAILED, LifecycleState.COMPLETED, LifecycleState.STOPPED]) {
      for (const target of Object.values(LifecycleState)) {
        expect(() => assertValidLifecycleTransition('instance-1', terminal, target)).toThrow(
          LifecycleTransitionError,
        );
      }
    }
  });
});
