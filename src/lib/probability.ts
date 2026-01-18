
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

// Probability of rolling at least a certain value on 3D6
const D3_CUMULATIVE_PROB_GT_EQ: { [key: number]: number } = {
    3: 216/216,
    4: 215/216,
    5: 212/216,
    6: 206/216,
    7: 196/216,
    8: 181/216,
    9: 160/216,
    10: 135/216,
    11: 108/216,
    12: 81/216,
    13: 56/216,
    14: 35/216,
    15: 20/216,
    16: 10/216,
    17: 4/216,
    18: 1/216,
    19: 0,
};


// Mean and Variance for a single 3D6 roll
const D3_MEAN = 10.5;
const D3_VARIANCE = 35 / 4; // 8.75

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

        // Use Central Limit Theorem to approximate the sum of n 3D6 rolls
        const mean = numAttrs * D3_MEAN;
        const variance = numAttrs * D3_VARIANCE;
        const stdDev = Math.sqrt(variance);

        // P(Sum >= X) = 1 - P(Sum < X) = 1 - CDF(X - 0.5) (with continuity correction)
        return 1 - normalCdf(targetSum - 0.5, mean, stdDev);
    }
    
    // 2. Handle individual attribute condition e.g. "KNO, PRE 10+" OR "CCA or RCA or STR 10+"
    const individualMatch = condition.match(/^([\w\s,or]+?) (\d+)\+$/);
    if (individualMatch) {
        const attrListStr = individualMatch[1].trim();
        const targetValue = parseInt(individualMatch[2], 10);
        
        const probSingleAttr = D3_CUMULATIVE_PROB_GT_EQ[targetValue] ?? 0;

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
