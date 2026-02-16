/**
 * Largest Triangle Three Buckets (LTTB) downsampling algorithm.
 * Industry-standard for financial time series (used by TradingView, etc.).
 * Preserves visual shape while reducing data points.
 */
export function lttb<T>(
  data: T[],
  threshold: number,
  getY: (d: T) => number
): T[] {
  if (data.length <= threshold || threshold < 3) return [...data];

  const result: T[] = [data[0]];
  const bucketSize = (data.length - 2) / (threshold - 2);
  let prevIdx = 0;

  for (let i = 0; i < threshold - 2; i++) {
    const currStart = Math.floor((i + 1) * bucketSize) + 1;
    const currEnd = Math.min(
      Math.floor((i + 2) * bucketSize) + 1,
      data.length
    );

    // Average point of next bucket
    const nextStart = Math.floor((i + 2) * bucketSize) + 1;
    const nextEnd = Math.min(
      Math.floor((i + 3) * bucketSize) + 1,
      data.length
    );
    let avgY = 0;
    let count = 0;
    for (let j = nextStart; j < nextEnd && j < data.length; j++) {
      avgY += getY(data[j]);
      count++;
    }
    avgY = count > 0 ? avgY / count : 0;
    const avgX =
      count > 0
        ? (nextStart + Math.min(nextEnd, data.length) - 1) / 2
        : nextStart;

    // Find largest triangle in current bucket
    let maxArea = -1;
    let bestIdx = currStart;
    const pY = getY(data[prevIdx]);

    for (let j = currStart; j < currEnd && j < data.length; j++) {
      const area = Math.abs(
        (prevIdx - avgX) * (getY(data[j]) - pY) -
        (prevIdx - j) * (avgY - pY)
      );
      if (area > maxArea) {
        maxArea = area;
        bestIdx = j;
      }
    }

    result.push(data[bestIdx]);
    prevIdx = bestIdx;
  }

  result.push(data[data.length - 1]);
  return result;
}
