class DrMarioGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        // Game board dimensions
        this.BOARD_WIDTH = 8;
        this.BOARD_HEIGHT = 16;
        this.CELL_SIZE = 40;
        
        // Colors
        this.COLORS = {
            RED: '#ff0000',
            BLUE: '#0000ff',
            YELLOW: '#ffff00',
            EMPTY: null,
            VIRUS_RED: '#ff0000', // Same as pill red for matching
            VIRUS_BLUE: '#0000ff', // Same as pill blue for matching
            VIRUS_YELLOW: '#ffff00' // Same as pill yellow for matching
        };
        
        // Game state
        this.board = [];
        this.currentPill = null;
        this.nextPill = null;
        this.gameRunning = false;
        this.gamePaused = false;
        this.level = 1;
        this.score = 0;
        this.virusCount = 0;
        this.dropTimer = 0;
        this.dropInterval = 600; // milliseconds
        this.lastTime = 0;
        
        this.initializeBoard();
        this.setupEventListeners();
        this.generateViruses();
        this.generateNextPill();
        this.spawnNewPill();
        this.gameRunning = true;
        this.gameLoop();
    }
    
    initializeBoard() {
        this.board = [];
        for (let y = 0; y < this.BOARD_HEIGHT; y++) {
            this.board[y] = [];
            for (let x = 0; x < this.BOARD_WIDTH; x++) {
                this.board[y][x] = { color: this.COLORS.EMPTY, isVirus: false };
            }
        }
    }
    
    generateViruses() {
        // Clear existing viruses
        this.virusCount = 0;
        const virusColors = [this.COLORS.VIRUS_RED, this.COLORS.VIRUS_BLUE, this.COLORS.VIRUS_YELLOW];
        const numViruses = Math.min(4 + this.level * 4, 84); // Increase viruses with level
        
        // Place viruses in bottom half of board
        const startY = Math.floor(this.BOARD_HEIGHT / 2);
        let placed = 0;
        
        while (placed < numViruses) {
            const x = Math.floor(Math.random() * this.BOARD_WIDTH);
            const y = startY + Math.floor(Math.random() * (this.BOARD_HEIGHT - startY));
            
            if (this.board[y][x].color === this.COLORS.EMPTY) {
                this.board[y][x] = {
                    color: virusColors[Math.floor(Math.random() * virusColors.length)],
                    isVirus: true
                };
                placed++;
                this.virusCount++;
            }
        }
        
        this.updateVirusCount();
    }
    
    generateNextPill() {
        const colors = [this.COLORS.RED, this.COLORS.BLUE, this.COLORS.YELLOW];
        this.nextPill = {
            color1: colors[Math.floor(Math.random() * colors.length)],
            color2: colors[Math.floor(Math.random() * colors.length)]
        };
    }
    
    spawnNewPill() {
        if (this.nextPill) {
            this.currentPill = {
                x: Math.floor(this.BOARD_WIDTH / 2) - 1,
                y: 0,
                color1: this.nextPill.color1,
                color2: this.nextPill.color2,
                orientation: 0 // 0: horizontal right, 1: vertical down, 2: horizontal left, 3: vertical up
            };
            this.generateNextPill();
            
            // Check if spawn position is blocked
            if (!this.isValidPosition(this.currentPill)) {
                this.gameOver();
                return false;
            }
        }
        return true;
    }
    
    isValidPosition(pill) {
        const positions = this.getPillPositions(pill);
        for (let pos of positions) {
            if (pos.x < 0 || pos.x >= this.BOARD_WIDTH || 
                pos.y < 0 || pos.y >= this.BOARD_HEIGHT) {
                return false;
            }
            if (this.board[pos.y][pos.x].color !== this.COLORS.EMPTY) {
                return false;
            }
        }
        return true;
    }
    
    getPillPositions(pill) {
        const positions = [{ x: pill.x, y: pill.y }];
        
        switch(pill.orientation) {
            case 0: // horizontal right
                positions.push({ x: pill.x + 1, y: pill.y });
                break;
            case 1: // vertical down
                positions.push({ x: pill.x, y: pill.y + 1 });
                break;
            case 2: // horizontal left
                positions.push({ x: pill.x - 1, y: pill.y });
                break;
            case 3: // vertical up
                positions.push({ x: pill.x, y: pill.y - 1 });
                break;
        }
        
        return positions;
    }
    
    movePill(dx, dy) {
        if (!this.currentPill || this.gamePaused) return false;
        
        const newPill = {
            ...this.currentPill,
            x: this.currentPill.x + dx,
            y: this.currentPill.y + dy
        };
        
        if (this.isValidPosition(newPill)) {
            this.currentPill = newPill;
            return true;
        }
        return false;
    }
    
    rotatePill() {
        if (!this.currentPill || this.gamePaused) return false;
        
        const newPill = {
            ...this.currentPill,
            orientation: (this.currentPill.orientation + 1) % 4
        };
        
        // Try to rotate in place
        if (this.isValidPosition(newPill)) {
            this.currentPill = newPill;
            return true;
        }
        
        // Try to nudge in different directions if rotation is blocked
        for (let dx of [-1, 1, 0]) {
            for (let dy of [-1, 0, 1]) {
                if (dx === 0 && dy === 0) continue; // Skip the original position
                const nudgedPill = { ...newPill, x: newPill.x + dx, y: newPill.y + dy };
                if (this.isValidPosition(nudgedPill)) {
                    this.currentPill = nudgedPill;
                    return true;
                }
            }
        }
        
        return false;
    }
    
    dropPill() {
        if (!this.movePill(0, 1)) {
            this.placePill();
            this.checkMatches();
            if (!this.spawnNewPill()) {
                return;
            }
        }
    }
    
    placePill() {
        if (!this.currentPill) return;
        
        const positions = this.getPillPositions(this.currentPill);
        this.board[positions[0].y][positions[0].x] = {
            color: this.currentPill.color1,
            isVirus: false
        };
        this.board[positions[1].y][positions[1].x] = {
            color: this.currentPill.color2,
            isVirus: false
        };
        
        this.currentPill = null;
    }
    
    checkMatches() {
        const toRemove = new Set();
        
        // Check horizontal matches
        for (let y = 0; y < this.BOARD_HEIGHT; y++) {
            let count = 1;
            let currentColor = this.board[y][0].color;
            let startX = 0;
            
            for (let x = 1; x <= this.BOARD_WIDTH; x++) {
                const cellColor = x < this.BOARD_WIDTH ? this.board[y][x].color : this.COLORS.EMPTY;
                
                if (cellColor === currentColor && currentColor !== this.COLORS.EMPTY) {
                    count++;
                } else {
                    if (count >= 4 && currentColor !== this.COLORS.EMPTY) {
                        for (let i = startX; i < startX + count; i++) {
                            toRemove.add(`${i},${y}`);
                        }
                    }
                    count = 1;
                    currentColor = cellColor;
                    startX = x;
                }
            }
        }
        
        // Check vertical matches
        for (let x = 0; x < this.BOARD_WIDTH; x++) {
            let count = 1;
            let currentColor = this.board[0][x].color;
            let startY = 0;
            
            for (let y = 1; y <= this.BOARD_HEIGHT; y++) {
                const cellColor = y < this.BOARD_HEIGHT ? this.board[y][x].color : this.COLORS.EMPTY;
                
                if (cellColor === currentColor && currentColor !== this.COLORS.EMPTY) {
                    count++;
                } else {
                    if (count >= 4 && currentColor !== this.COLORS.EMPTY) {
                        for (let i = startY; i < startY + count; i++) {
                            toRemove.add(`${x},${i}`);
                        }
                    }
                    count = 1;
                    currentColor = cellColor;
                    startY = y;
                }
            }
        }
        
        // Remove matched pieces
        if (toRemove.size > 0) {
            let virusesRemoved = 0;
            toRemove.forEach(pos => {
                const [x, y] = pos.split(',').map(Number);
                if (this.board[y][x].isVirus) {
                    virusesRemoved++;
                }
                this.board[y][x] = { color: this.COLORS.EMPTY, isVirus: false };
            });
            
            this.virusCount -= virusesRemoved;
            this.score += toRemove.size * 100;
            this.updateScore();
            this.updateVirusCount();
            
            this.applyGravity();
            
            // Check for chain reactions
            setTimeout(() => this.checkMatches(), 300);
            
            // Check win condition
            if (this.virusCount === 0) {
                this.levelComplete();
            }
        }
    }
    
    applyGravity() {
        let moved = false;
        
        // Apply gravity one step at a time, but only to pills (not viruses)
        for (let x = 0; x < this.BOARD_WIDTH; x++) {
            for (let y = this.BOARD_HEIGHT - 2; y >= 0; y--) {
                if (this.board[y][x].color !== this.COLORS.EMPTY && 
                    !this.board[y][x].isVirus && // Only move pills, not viruses
                    this.board[y + 1][x].color === this.COLORS.EMPTY) {
                    // Move pill down one step
                    this.board[y + 1][x] = this.board[y][x];
                    this.board[y][x] = { color: this.COLORS.EMPTY, isVirus: false };
                    moved = true;
                }
            }
        }
        
        // Continue applying gravity if pieces moved
        if (moved) {
            setTimeout(() => this.applyGravity(), 100);
        }
    }
    
    levelComplete() {
        this.level++;
        this.score += 1000 * this.level;
        this.dropInterval = Math.max(100, this.dropInterval - 50);
        this.updateLevel();
        this.updateScore();
        
        setTimeout(() => {
            this.initializeBoard();
            this.generateViruses();
            this.spawnNewPill();
        }, 1000);
    }
    
    gameOver() {
        this.gameRunning = false;
        document.getElementById('game-over-message').textContent = 'Game Over!';
        document.getElementById('game-over').classList.remove('hidden');
    }
    
    restart() {
        this.level = 1;
        this.score = 0;
        this.dropInterval = 600;
        this.initializeBoard();
        this.generateViruses();
        this.generateNextPill();
        this.spawnNewPill();
        this.gameRunning = true;
        this.gamePaused = false;
        this.updateLevel();
        this.updateScore();
        document.getElementById('game-over').classList.add('hidden');
    }
    
    togglePause() {
        this.gamePaused = !this.gamePaused;
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (!this.gameRunning) return;
            
            switch(e.code) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.movePill(-1, 0);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.movePill(1, 0);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.rotatePill();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.dropPill();
                    break;
                case 'Space':
                    e.preventDefault();
                    this.togglePause();
                    break;
            }
        });
    }
    
    update(deltaTime) {
        if (!this.gameRunning || this.gamePaused) return;
        
        this.dropTimer += deltaTime;
        if (this.dropTimer >= this.dropInterval) {
            this.dropPill();
            this.dropTimer = 0;
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw board
        for (let y = 0; y < this.BOARD_HEIGHT; y++) {
            for (let x = 0; x < this.BOARD_WIDTH; x++) {
                const cell = this.board[y][x];
                if (cell.color !== this.COLORS.EMPTY) {
                    this.drawCell(x, y, cell.color, cell.isVirus);
                }
            }
        }
        
        // Draw current pill
        if (this.currentPill) {
            const positions = this.getPillPositions(this.currentPill);
            // First position always gets color1, second position gets color2
            this.drawCell(positions[0].x, positions[0].y, this.currentPill.color1, false);
            this.drawCell(positions[1].x, positions[1].y, this.currentPill.color2, false);
        }
        
        // Draw next pill
        this.nextCtx.fillStyle = '#000000';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        if (this.nextPill) {
            this.nextCtx.fillStyle = this.nextPill.color1;
            this.nextCtx.fillRect(10, 10, 20, 20);
            this.nextCtx.fillStyle = this.nextPill.color2;
            this.nextCtx.fillRect(35, 10, 20, 20);
            
            // Add borders
            this.nextCtx.strokeStyle = '#ffffff';
            this.nextCtx.lineWidth = 1;
            this.nextCtx.strokeRect(10, 10, 20, 20);
            this.nextCtx.strokeRect(35, 10, 20, 20);
        }
    }
    
    drawCell(x, y, color, isVirus) {
        const pixelX = x * this.CELL_SIZE;
        const pixelY = y * this.CELL_SIZE;
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(pixelX, pixelY, this.CELL_SIZE, this.CELL_SIZE);
        
        // Add border
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(pixelX, pixelY, this.CELL_SIZE, this.CELL_SIZE);
        
        // Draw virus pattern - make virus visually distinct while keeping same color for matching
        if (isVirus) {
            // Darken the virus color slightly for visual distinction
            const darkerColor = this.darkenColor(color);
            this.ctx.fillStyle = darkerColor;
            this.ctx.fillRect(pixelX, pixelY, this.CELL_SIZE, this.CELL_SIZE);
            
            // Add virus pattern in white
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(pixelX + 5, pixelY + 5, 4, 4);
            this.ctx.fillRect(pixelX + 31, pixelY + 5, 4, 4);
            this.ctx.fillRect(pixelX + 18, pixelY + 15, 4, 8);
            this.ctx.fillRect(pixelX + 15, pixelY + 28, 10, 4);
        }
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
    }
    
    updateLevel() {
        document.getElementById('level').textContent = this.level;
    }
    
    updateVirusCount() {
        document.getElementById('virus-count').textContent = this.virusCount;
    }
    
    darkenColor(color) {
        // Convert hex color to darker version for virus display
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 50);
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 50);
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 50);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        if (this.gameRunning) {
            requestAnimationFrame((time) => this.gameLoop(time));
        }
    }
}

// Start the game
let game;
window.addEventListener('load', () => {
    game = new DrMarioGame();
});