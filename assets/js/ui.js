// Main App Logic
class App {
    constructor() {
        // SackVisualizer is now on window
        this.visualizer = new window.SackVisualizer(
            document.querySelector('.sack-container'),
            document.getElementById('items-pool')
        );

        this.initializeEventListeners();
        this.generateItemInputs(5); // Default 5 items
        this.logContainer = document.getElementById('execution-log');
        this.logStatus = document.getElementById('log-status');

        // Initialize speed
        this.setSpeed(2); // Default to index 2 (1x)
    }

    initializeEventListeners() {
        document.getElementById('generate-btn').addEventListener('click', () => {
            const count = parseInt(document.getElementById('item-count').value) || 5;
            this.generateItemInputs(count);
        });

        document.getElementById('random-btn').addEventListener('click', () => {
            this.randomizeInputs();
        });

        document.getElementById('solve-btn').addEventListener('click', () => {
            this.runSimulation();
        });

        document.getElementById('speed-range').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            this.setSpeed(val);
        });
    }

    setSpeed(val) {
        // Map slider (0-4) to actual speeds
        const speeds = [0.25, 0.5, 1, 2, 4];
        this.animationSpeed = speeds[val] || 1;
        document.getElementById('speed-display').textContent = `${this.animationSpeed}x`;
    }

    generateItemInputs(count) {
        const container = document.getElementById('items-inputs-container');
        container.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const row = document.createElement('div');
            row.className = 'item-input-row';

            // Unique IDs for accessibility
            const weightId = `weight-${i}`;
            const valueId = `value-${i}`;

            row.innerHTML = `
                <span class="item-index">#${i + 1}</span>
                <label for="${weightId}" style="position:absolute; width:1px; height:1px; overflow:hidden;">Item ${i + 1} Weight</label>
                <input type="number" id="${weightId}" name="weight-${i}" class="weight-input" placeholder="Weight" min="1">
                
                <label for="${valueId}" style="position:absolute; width:1px; height:1px; overflow:hidden;">Item ${i + 1} Value</label>
                <input type="number" id="${valueId}" name="value-${i}" class="value-input" placeholder="Value" min="1">
            `;
            container.appendChild(row);
        }
    }

    randomizeInputs() {
        const weights = document.querySelectorAll('.weight-input');
        const values = document.querySelectorAll('.value-input');

        weights.forEach((w, i) => {
            w.value = Math.floor(Math.random() * 20) + 5;
            values[i].value = Math.floor(Math.random() * 50) + 10;
        });
    }

    getItemsFromInputs() {
        const items = [];
        const weights = document.querySelectorAll('.weight-input');
        const values = document.querySelectorAll('.value-input');

        weights.forEach((w, i) => {
            const weight = parseFloat(w.value);
            const value = parseFloat(values[i].value);

            if (!isNaN(weight) && !isNaN(value) && weight > 0) {
                items.push({
                    id: i + 1,
                    weight,
                    value
                });
            }
        });
        return items;
    }

    renderPool(items) {
        const poolContainer = document.getElementById('items-pool');
        poolContainer.innerHTML = '';

        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'pool-item';
            el.dataset.id = item.id;
            el.innerHTML = `
                <div class="pool-item-inner">
                    <strong>Item ${item.id}</strong>
                    <span>W:${item.weight} | V:${item.value}</span>
                </div>
            `;
            poolContainer.appendChild(el);
        });
    }

    clearLogs() {
        if (!this.logContainer) return;
        this.logContainer.innerHTML = '';
        this.logStatus.textContent = 'Ready';
        this.logStatus.className = 'log-badge';
    }

    addLog(message, type = 'default') {
        if (!this.logContainer) return;
        const div = document.createElement('div');
        div.className = `log-entry ${type}`;
        div.textContent = message;
        this.logContainer.appendChild(div);

        // Scroll to bottom
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    async runSimulation() {
        const capacity = parseFloat(document.getElementById('capacity').value);
        if (isNaN(capacity) || capacity <= 0) {
            alert('Please enter a valid capacity.');
            return;
        }

        const items = this.getItemsFromInputs();
        if (items.length === 0) {
            alert('Please enter at least one valid item.');
            return;
        }

        const btn = document.getElementById('solve-btn');
        btn.disabled = true;

        // Reset
        this.renderPool(items);
        this.visualizer.reset(capacity);
        this.updateStats(0, 0, capacity);
        this.clearLogs();
        this.logStatus.textContent = 'Running';
        this.logStatus.classList.add('running');

        this.addLog(`Starting Fractional Knapsack Greedy Algorithm...`, 'info');
        this.addLog(`Capacity: ${capacity}, Total Items: ${items.length}`);

        // Solve using global function
        const { steps, totalValue, allocations } = window.solveKnapsack(items, capacity);

        // Animate
        let currentVal = 0;
        let currentWeight = 0;

        for (const step of steps) {
            const startMsg = step.fraction === 1
                ? `Checking Item ${step.item.id} (Ratio: ${step.item.ratio.toFixed(2)})... Fits completely.`
                : `Checking Item ${step.item.id} (Ratio: ${step.item.ratio.toFixed(2)})... Fits only ${(step.fraction * 100).toFixed(1)}%.`;

            this.addLog(startMsg);

            // Calculate duration based on speed
            // Base duration 1.5s
            // at 1x = 1.5s
            // at 2x = 0.75s
            // at 0.5x = 3s
            const duration = 1500 / this.animationSpeed;
            await this.visualizer.animateItemDrop(step.item, step.fraction, duration);

            // Log result
            const type = step.fraction === 1 ? 'full' : 'partial';
            const tookMsg = step.fraction === 1
                ? `-> Took Item ${step.item.id} (Full). +${step.weightTaken} Weight, +${step.valueGained} Value.`
                : `-> Took Item ${step.item.id} (Partial: ${(step.fraction * 100).toFixed(1)}%). +${step.weightTaken.toFixed(2)} Weight, +${step.valueGained.toFixed(2)} Value.`;

            this.addLog(tookMsg, type);

            // Update stats progressively
            currentVal += step.valueGained;
            currentWeight += step.weightTaken;
            this.updateStats(currentVal, currentWeight, capacity);

            // Small pause between items, also scaled by speed
            await new Promise(r => setTimeout(r, 500 / this.animationSpeed));
        }

        // Mark remaining items as Not Taken
        const takenIds = new Set(steps.map(s => s.item.id));
        items.forEach(item => {
            if (!takenIds.has(item.id)) {
                this.visualizer.markAsNotTaken(item.id);
            }
        });

        this.addLog(`Algorithm Finished! Total Value: ${totalValue.toFixed(2)}`, 'info');
        this.logStatus.textContent = 'Finished';
        this.logStatus.className = 'log-badge finished';

        btn.disabled = false;
    }

    updateStats(value, weight, capacity) {
        document.getElementById('stat-value').textContent = value.toFixed(2);
        document.getElementById('stat-weight').textContent = `${weight.toFixed(2)} / ${capacity}`;

        const percentage = (weight / capacity) * 100;
        document.getElementById('stat-percentage').textContent = `${percentage.toFixed(1)}%`;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
