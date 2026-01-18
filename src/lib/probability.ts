
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
 * Calculates the probability of a single, simple candidacy condition being met.
 * This is the base case for the recursive expression evaluator.
 * @param condition A simple condition string, e.g., "INT + KNO >= 28" or "KNO 10+".
 * @returns The probability (0 to 1) of this condition being true.
 */
function calculateSubConditionProbability(condition: string): number {
    // 1. Handle sum condition e.g., "INT + KNO + PRE + POW >= 28" or "(INT + KNO) >= 28"
    const sumMatch = condition.trim().match(/^\(?([\w\s\+]+?)\)? >= (\d+)$/);
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
    
    // 2. Handle single individual attribute condition e.g., "KNO 10+"
    const individualMatch = condition.trim().match(/^(\w+) (\d+)\+$/);
    if (individualMatch) {
        const targetValue = parseInt(individualMatch[2], 10);
        return D2_CUMULATIVE_PROB_GT_EQ[targetValue] ?? 0;
    }

    throw new Error(`Invalid sub-condition format: "${condition}"`);
}


/**
 * Pre-processes a candidacy string to expand shorthand notations into a full boolean expression.
 * e.g., "A or B 10+" becomes "(A 10+ or B 10+)"
 * e.g., "A, B 10+" becomes "(A 10+ and B 10+)"
 * @param candidacyString The raw string from the data.
 * @returns A standardized, well-formed boolean expression string.
 */
function preprocessCandidacyString(candidacyString: string): string {
    const shorthandRegex = /((?:\w+(?:\s*,\s*|\s+or\s+))+?\w+)\s+(?<!\+)\s*(\d+\+)/g;

    let processed = candidacyString.replace(shorthandRegex, (match, attrList, requirement) => {
        const hasOr = /\s+or\s+/.test(attrList);
        const separator = hasOr ? /\s+or\s+/ : /\s*,\s*/;
        const operator = hasOr ? ' or ' : ' and ';
        
        const attrs = attrList.split(separator).map(s => s.trim()).filter(Boolean);
        
        if (attrs.length === 1) {
            return `${attrs[0]} ${requirement}`;
        }
        
        return '(' + attrs.map(attr => `${attr.trim()} ${requirement}`).join(operator) + ')';
    });

    return processed.replace(/,\s*and\s*/g, ' and ');
}


/**
 * Recursively evaluates a parsed candidacy expression.
 * @param expr The expression string to evaluate.
 * @returns The probability (0 to 1) of the expression being true, or -1 on error.
 */
function evaluateExpression(expr: string): number {
    expr = expr.trim();

    if (expr.startsWith('(') && expr.endsWith(')')) {
        let openParen = 1;
        let isFullyWrapped = true;
        for (let i = 1; i < expr.length - 1; i++) {
            if (expr[i] === '(') openParen++;
            if (expr[i] === ')') openParen--;
            if (openParen === 0) {
                isFullyWrapped = false;
                break;
            }
        }
        if (isFullyWrapped) {
            return evaluateExpression(expr.substring(1, expr.length - 1));
        }
    }

    let parenCount = 0;
    
    for (let i = expr.length - 1; i >= 0; i--) {
        if (expr[i] === ')') parenCount++;
        if (expr[i] === '(') parenCount--;
        
        if (parenCount === 0 && expr.substring(i).startsWith(' or ')) {
            const left = expr.substring(0, i);
            const right = expr.substring(i + ' or '.length);
            const pLeft = evaluateExpression(left);
            const pRight = evaluateExpression(right);
            if (pLeft === -1 || pRight === -1) return -1;
            return pLeft + pRight - (pLeft * pRight);
        }
    }
    
    parenCount = 0;
    for (let i = expr.length - 1; i >= 0; i--) {
        if (expr[i] === ')') parenCount++;
        if (expr[i] === '(') parenCount--;
        
        if (parenCount === 0 && expr.substring(i).startsWith(' and ')) {
            const left = expr.substring(0, i);
            const right = expr.substring(i + ' and '.length);
            const pLeft = evaluateExpression(left);
            const pRight = evaluateExpression(right);
            if (pLeft === -1 || pRight === -1) return -1;
            return pLeft * pRight;
        }
    }

    try {
        return calculateSubConditionProbability(expr);
    } catch {
        return -1;
    }
}


/**
 * Calculates the exact probability of a profession's candidacy expression being true.
 * Supports logical grouping with parentheses and 'and'/'or' operators.
 * @param candidacyString The expression from the professions data.
 * @returns The total probability (from 0 to 1), or -1 if the expression is invalid.
 */
export function calculateCandidacyProbability(candidacyString: string): number {
    if (!candidacyString || candidacyString.trim() === "") {
        return -1;
    }
    if (candidacyString.trim().toLowerCase() === "any") {
      return 1.0;
    }

    const processedExpr = preprocessCandidacyString(candidacyString);

    try {
        const result = evaluateExpression(processedExpr);
        return result === -1 ? -1 : result;
    } catch (error) {
        console.error("Candidacy parsing error:", error);
        return -1;
    }
}
