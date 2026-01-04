// Solves the Fractional Knapsack Problem.
window.solveKnapsack = function (items, capacity) {
    // Clone items and calculate ratio
    let sortedItems = items.map(item => ({
        ...item,
        ratio: item.value / item.weight
    }));

    // Sort by ratio in descending order
    sortedItems.sort((a, b) => b.ratio - a.ratio);

    const steps = [];
    let currentWeight = 0;
    let totalValue = 0;

    // Track final allocations for summary
    const allocations = [];

    for (let i = 0; i < sortedItems.length; i++) {
        if (currentWeight >= capacity) break;

        const item = sortedItems[i];
        const remainingCapacity = capacity - currentWeight;
        let weightToTake;
        let fraction;

        if (item.weight <= remainingCapacity) {
            // Take the whole item
            weightToTake = item.weight;
            fraction = 1;
            currentWeight += item.weight;
            totalValue += item.value;
        } else {
            // Take fraction of the item
            weightToTake = remainingCapacity;
            fraction = weightToTake / item.weight;
            currentWeight += weightToTake;
            totalValue += item.value * fraction;
        }

        const gainedValue = item.value * fraction;

        allocations.push({
            id: item.id,
            takenWeight: weightToTake,
            totalItemWeight: item.weight,
            gainedValue: gainedValue,
            fraction: fraction
        });

        steps.push({
            action: 'TAKE',
            item: item,
            fraction: fraction,
            weightTaken: weightToTake,
            valueGained: gainedValue,
            currentTotalWeight: currentWeight,
            currentTotalValue: totalValue
        });
    }

    return {
        steps,
        totalValue,
        allocations
    };
}
