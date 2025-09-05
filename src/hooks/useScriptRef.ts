import { useEffect, useRef } from 'react';

// ==============================|| HOOKS - COMPONENT LIFECYCLE REFERENCE  ||============================== //

export default function useScriptRef() {
  const scripted = useRef(true);

  useEffect(
    () => () => {
      scripted.current = false;
    },
    []
  );

  return scripted;
}
