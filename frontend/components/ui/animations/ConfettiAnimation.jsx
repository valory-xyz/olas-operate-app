import { useCallback, useEffect, useRef } from 'react';
import ReactCanvasConfetti from 'react-canvas-confetti';
import { useInterval } from 'usehooks-ts';

const canvasStyles = {
  position: 'fixed',
  pointerEvents: 'none',
  width: '100%',
  height: '100%',
  top: 0,
  left: 0,
};

export const ConfettiAnimation = ({ loop = true }) => {
  const animationInstance = useRef(null);

  const makeShot = useCallback((particleRatio, opts) => {
    if (!animationInstance.current) return;

    animationInstance.current({
      ...opts,
      origin: { y: 0.45 },
      particleCount: Math.floor(200 * particleRatio),
    });
  }, []);

  const fire = useCallback(() => {
    makeShot(0.25, { spread: 26, startVelocity: 55 });
    makeShot(0.2, { spread: 60 });
    makeShot(0.35, { spread: 80, decay: 0.91, scalar: 0.8 });
    makeShot(0.1, { spread: 100, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    makeShot(0.1, { spread: 100, startVelocity: 45 });
  }, [makeShot]);

  const getInstance = useCallback((instance) => {
    animationInstance.current = instance;
  }, []);

  // Fire confetti every 2.5 seconds if loop is true
  useInterval(() => fire(), loop ? 2500 : null);

  // Fire the first show on mount
  useEffect(() => {
    fire();
  }, [fire]);

  return <ReactCanvasConfetti refConfetti={getInstance} style={canvasStyles} />;
};
