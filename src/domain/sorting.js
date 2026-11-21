// Stable merge sort. The input is copied before any comparisons are made.
export function mergeSort(items, compare) {
  if (!Array.isArray(items)) return [];
  if (items.length < 2) return items.slice();

  const middle = Math.floor(items.length / 2);
  const left = mergeSort(items.slice(0, middle), compare);
  const right = mergeSort(items.slice(middle), compare);
  const merged = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    // Choosing the left item on equality is what makes the sort stable.
    if (compare(left[leftIndex], right[rightIndex]) <= 0) {
      merged.push(left[leftIndex++]);
    } else {
      merged.push(right[rightIndex++]);
    }
  }
  return merged.concat(left.slice(leftIndex), right.slice(rightIndex));
}
