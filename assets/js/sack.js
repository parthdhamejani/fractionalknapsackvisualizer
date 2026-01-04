window.SackVisualizer = class SackVisualizer {
    constructor(sackContainer, queueContainer) {
        this.sackContainer = sackContainer;
        this.sackBody = sackContainer.querySelector('.sack-fill-area');
        this.queueContainer = queueContainer;
        this.capacity = 0;
        this.currentFillHeight = 0; // percentage
    }

    reset(capacity) {
        this.capacity = capacity;
        this.currentFillHeight = 0;
        this.sackBody.innerHTML = '';
        // Clear active states in queue
        const queueItems = this.queueContainer.querySelectorAll('.pool-item');
        queueItems.forEach(item => {
            item.classList.remove('taken', 'selected-animate');
            item.style.opacity = '1';
        });
    }

    async animateItemDrop(item, fraction, duration = 1000) {
        return new Promise(resolve => {
            // 1. Find the source element in the pool
            const sourceInfo = this.findSourceElement(item.id);
            if (!sourceInfo) {
                // Should not happen, but fallback
                this.createAndDrop(item, fraction, null, duration, resolve);
                return;
            }

            const { element, rect } = sourceInfo;

            // 2. Create a "flying" clone
            const clone = element.cloneNode(true);
            clone.classList.add('selected-animate');
            // Remove hover effects or extra classes

            // Set initial position
            clone.style.top = `${rect.top}px`;
            clone.style.left = `${rect.left}px`;
            clone.style.width = `${rect.width}px`;
            clone.style.height = `${rect.height}px`;
            clone.style.margin = '0';

            document.body.appendChild(clone);

            // 3. Calculate target position (Above the sack)
            const sackRect = this.sackContainer.getBoundingClientRect();
            const targetTop = sackRect.top - 60; // Slightly above rim
            const targetLeft = sackRect.left + (sackRect.width / 2) - (rect.width / 2);

            // Animate only the move first
            requestAnimationFrame(() => {
                clone.style.top = `${targetTop}px`;
                clone.style.left = `${targetLeft}px`;
                // Scale up slightly for effect
                clone.style.transform = 'scale(1.2)';
            });

            // 4. When move ends, drop into sack
            setTimeout(() => {
                // Drop animation: fade out clone, create real item in sack
                clone.style.opacity = '0';
                clone.style.transform = 'scale(0.5) translateY(100px)';

                this.addSackItem(item, fraction);

                // Mark source as taken/partial
                // Remove opacity fade from previous logic, apply colors
                element.style.opacity = '1';
                if (fraction === 1) {
                    element.classList.add('pool-taken-full');
                    element.classList.remove('pool-taken-partial');
                } else {
                    element.classList.add('pool-taken-partial');
                }

                setTimeout(() => {
                    clone.remove();
                    resolve();
                }, 300); // Wait for fade out
            }, duration * 0.6); // Move takes 60% of duration
        });
    }

    markAsNotTaken(id) {
        const sourceInfo = this.findSourceElement(id);
        if (sourceInfo) {
            sourceInfo.element.classList.add('pool-not-taken');
        }
    }

    findSourceElement(id) {
        // We look for the attribute data-id
        const items = Array.from(this.queueContainer.children);
        const element = items.find(el => el.dataset.id == id);
        if (element) {
            return {
                element,
                rect: element.getBoundingClientRect()
            };
        }
        return null;
    }

    addSackItem(item, fraction) {
        // Calculate height percentage relative to capacity
        // Note: The physical height of the sack represents 100% capacity
        // So item height % = (itemWeight * fraction) / capacity * 100
        const percentageHeight = ((item.weight * fraction) / this.capacity) * 100;

        const sackItem = document.createElement('div');
        sackItem.className = 'sack-item falling';

        if (fraction === 1) {
            sackItem.classList.add('full-item');
            sackItem.style.backgroundColor = '#2ecc71'; // Green for full
            sackItem.style.color = 'white';
        } else {
            sackItem.style.backgroundColor = '#f1c40f'; // Yellow for partial
            sackItem.style.color = '#333'; // Dark text for contrast on yellow
        }

        sackItem.style.height = `${percentageHeight}%`;

        // Content
        const label = fraction === 1
            ? `Item ${item.id}`
            : `Item ${item.id} (${(fraction * 100).toFixed(0)}%)`;

        sackItem.innerHTML = `
            <div class="sack-item-shimmer"></div>
            <span class="sack-item-label">${label}</span>
        `;

        // In column-reverse, appending adds to the 'top' of the stack (which is visually bottom first)
        // Wait, column-reverse:
        // Container
        //  Item 1 (Bottom)
        //  Item 2 (Top)
        // So appendChild adds to the end of the list, which is the visual TOP. Correct.
        this.sackBody.appendChild(sackItem);

        // Simple enter animation is handled by CSS '.falling' class
    }
}
