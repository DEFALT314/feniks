// Does the library have an innovation for this problem? (white-spot detection without the LLM)
//
// A single similarity threshold misses many uncovered problems. What differs is the shape: for a
// covered problem one or two innovations stand out, for an uncovered one all similarities are flat.
// Logistic regression over such features, fitted on 311 covered and 80 uncovered queries
// (5-fold cross-validated: flags 92% of uncovered problems, 10% false alarms). Query length is
// deliberately not a feature: it separated the training sets, not covered from uncovered problems.
import model from "@/data/derived/coverage_model.json";

export const COVERED_BELOW = model.threshold;

// sortedSimilarities: best first, at least 10 values for a meaningful spread.
export function coverageFeatures(sortedSimilarities: number[], bm25TopScore: number): number[] {
  const s = sortedSimilarities;
  const at = (i: number) => s[Math.min(i, s.length - 1)] ?? 0;
  return [at(0), at(0) - at(9), at(0) - at(1), Math.log1p(bm25TopScore)];
}

export function coveredProbability(
  sortedSimilarities: number[],
  bm25TopScore: number,
): number | null {
  if (!sortedSimilarities.length) return null;
  const x = coverageFeatures(sortedSimilarities, bm25TopScore);
  const z = x.reduce(
    (sum, v, i) => sum + ((v - model.mean[i]) / model.std[i]) * model.weights[i],
    model.bias,
  );
  return 1 / (1 + Math.exp(-z));
}
