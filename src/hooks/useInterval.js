import { useEffect, useRef } from 'react';

// Кастомный хук для декларативного setInterval
function useInterval(callback, delay) {
  const savedCallback = useRef();

  // Запоминаем последний коллбэк
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Настраиваем интервал
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

export default useInterval;