
'use client';

// Polynomial approximation for the error function erf(x)
// from Abramowitz and Stegun formula 7.1.26
// https://en.wikipedia.org/wiki/Error_function#Numerical_approximations
function erf(x: number): number {
    // constants
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = (x >= 0) ? 1 : -1;
    const absX = Math.abs(x);

    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

    return sign * y;
}


// Cumulative distribution function for the normal distribution
function normalCdf(x: number, mean: number, stdDev: number): number {
    if (stdDev === 0) {
        return x < mean ? 0 : 1;
    }
    return 0.5 * (1 + erf((x - mean) / (stdDev * Math.sqrt(2))));
}

// Probability of rolling at least a certain value on 2D6
const D2_CUMULATIVE_PROB_GT_EQ: { [key: number]: number } = {
    2: 36/36,
    3: 35/36,
    4: 33/36,
    5: 30/36,
    6: 26/36,
    7: 21/36,
    8: 15/36,
    9: 10/36,
    10: 6/36,
    11: 3/36,
    12: 1/36,
    13: 0,
};


// Mean and Variance for a single 2D6 roll
const D2_MEAN = 7;
const D2_VARIANCE = 35 / 6; // ~5.833

/**
 * Calculates the probability of a single candidacy sub-condition being met.
 * @param condition A single part of the candidacy string, e.g., "INT + KNO >= 28" or "KNO, PRE 10+".
 * @returns The probability (0 to 1) of this condition being true.
 */
function calculateSubConditionProbability(condition: string): number {
    // 1. Handle sum condition e.g. "INT + KNO + PRE + POW >= 28"
    const sumMatch = condition.match(/^([\w\s\+]+?) >= (\d+)$/);
    if (sumMatch) {
        const attrsToSum = sumMatch[1].split('+').map(s => s.trim());
        const numAttrs = attrsToSum.length;
        const targetSum = parseInt(sumMatch[2], 10);

        // Use Central Limit Theorem to approximate the sum of n 2D6 rolls
        const mean = numAttrs * D2_MEAN;
        const variance = numAttrs * D2_VARIANCE;
        const stdDev = Math.sqrt(variance);

        // P(Sum >= X) = 1 - P(Sum < X) = 1 - CDF(X - 0.5) (with continuity correction)
        return 1 - normalCdf(targetSum - 0.5, mean, stdDev);
    }
    
    // 2. Handle individual attribute condition e.g. "KNO, PRE 10+" OR "CCA or RCA or STR 10+"
    const individualMatch = condition.match(/^([\w\s,or]+?) (\d+)\+$/);
    if (individualMatch) {
        const attrListStr = individualMatch[1].trim();
        const targetValue = parseInt(individualMatch[2], 10);
        
        const probSingleAttr = D2_CUMULATIVE_PROB_GT_EQ[targetValue] ?? 0;

        if (attrListStr.includes(' or ')) {
            // OR condition: P(A or B or C) = 1 - P(not A and not B and not C)
            const attrsToCheck = attrListStr.split(' or ').map(s => s.trim());
            const probNotSingleAttr = 1 - probSingleAttr;
            const probAllFail = Math.pow(probNotSingleAttr, attrsToCheck.length);
            return 1 - probAllFail;
        } else {
            // AND condition: P(A and B and C) = P(A) * P(B) * P(C)
            const attrsToCheck = attrListStr.split(',').map(s => s.trim());
            return Math.pow(probSingleAttr, attrsToCheck.length);
        }
    }

    return 0; // Should not be reached for valid expressions
}


/**
 * Calculates the exact probability of a profession's candidacy expression being true.
 * @param candidacyString The expression from the professions data (e.g., "INT + KNO >= 28, and INT, KNO 10+").
 * @returns The total probability (from 0 to 1).
 */
export function calculateCandidacyProbability(candidacyString: string): number {
    if (candidacyString === "Any") {
      return 1.0;
    }

    // Split by ", and " to get the main independent conditions
    const mainConditions = candidacyString.split(', and ');
    
    let totalProbability = 1.0;

    for (const condition of mainConditions) {
        const subProb = calculateSubConditionProbability(condition);
        totalProbability *= subProb;
    }
    
    return totalProbability;
}
