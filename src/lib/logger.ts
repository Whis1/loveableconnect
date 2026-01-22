 export const logger = {
   log: (...args: any[]) => {
     if (import.meta.env.DEV) console.log(...args);
   },
   error: (...args: any[]) => console.error(...args),
   warn: (...args: any[]) => console.warn(...args),
 };