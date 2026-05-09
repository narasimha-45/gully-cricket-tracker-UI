export const formatOvers = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`;

export const calcCRR = (runs, balls) =>
  balls === 0 ? "0.00" : (runs / (balls / 6)).toFixed(2);




