import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween } from 'cc';
import { Tile, TileType } from './Tile';
import { GameManager } from './GameManager';

const { ccclass, property } = _decorator;

@ccclass('Board')
export class Board extends Component {
    @property
    boardSize: number = 8;

    @property
    tileSize: number = 80;

    @property
    tileSpacing: number = 5;

    @property
    animationDuration: number = 0.3;

    private tilePrefab: Prefab = null;
    private gameManager: GameManager = null;
    private tiles: Tile[][] = [];
    private isAnimating: boolean = false;

    public initialize(tilePrefab: Prefab, gameManager: GameManager) {
        this.tilePrefab = tilePrefab;
        this.gameManager = gameManager;
        this.isAnimating = false;
        this.createBoard();
    }

    private createBoard() {
        this.tiles = [];
        
        for (let row = 0; row < this.boardSize; row++) {
            this.tiles[row] = [];
            for (let col = 0; col < this.boardSize; col++) {
                const tile = this.createTile(row, col);
                this.tiles[row][col] = tile;
            }
        }

        this.removeInitialMatches();
    }

    private createTile(row: number, col: number): Tile {
        const tileNode = instantiate(this.tilePrefab);
        tileNode.setParent(this.node);
        
        const tile = tileNode.getComponent(Tile);
        const randomType = this.getRandomTileType();
        
        tile.initialize(randomType, this.gameManager, row, col);
        
        const position = this.getTilePosition(row, col);
        tileNode.setPosition(position);
        
        return tile;
    }

    private getTilePosition(row: number, col: number): Vec3 {
        const startX = -(this.boardSize - 1) * (this.tileSize + this.tileSpacing) / 2;
        const startY = (this.boardSize - 1) * (this.tileSize + this.tileSpacing) / 2;
        
        const x = startX + col * (this.tileSize + this.tileSpacing);
        const y = startY - row * (this.tileSize + this.tileSpacing);
        
        return new Vec3(x, y, 0);
    }

    private getRandomTileType(): TileType {
        const types = Object.keys(TileType)
            .filter(key => !isNaN(Number(TileType[key])))
            .map(key => Number(TileType[key]));
        return types[Math.floor(Math.random() * types.length)] as TileType;
    }

    private removeInitialMatches() {
        let hasMatches = true;
        while (hasMatches) {
            hasMatches = false;
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    const matches = this.findMatchesAt(row, col);
                    if (matches.length >= 3) {
                        hasMatches = true;
                        for (const match of matches) {
                            const newType = this.getRandomTileType();
                            match.setTileType(newType);
                        }
                    }
                }
            }
        }
    }

    public findMatches(tile: Tile): Tile[] {
        const row = tile.getRow();
        const col = tile.getCol();
        return this.findMatchesAt(row, col);
    }

    public highlightMatches(tile: Tile) {
        const matches = this.findMatches(tile);
        matches.forEach((match, index) => {
            match.highlight();
        });
        return matches;
    }

    public blinkMatches(tile: Tile) {
        const matches = this.findMatches(tile);
        matches.forEach((match, index) => {
            match.startBlinking();
        });
        return matches;
    }

    public clearHighlights() {
        let clearedCount = 0;
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.tiles[row][col]) {
                    if (this.tiles[row][col].isHighlightedTile()) {
                        this.tiles[row][col].unhighlight();
                        clearedCount++;
                    }
                }
            }
        }
    }

    public stopAllBlinking() {
        let stoppedCount = 0;
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.tiles[row][col]) {
                    if (this.tiles[row][col].isBlinkingTile()) {
                        this.tiles[row][col].stopBlinking();
                        stoppedCount++;
                    }
                }
            }
        }
    }

    public async swapTiles(tile1: Tile, tile2: Tile): Promise<void> {
        const row1 = tile1.getRow();
        const col1 = tile1.getCol();
        const row2 = tile2.getRow();
        const col2 = tile2.getCol();
        
        this.tiles[row1][col1] = tile2;
        this.tiles[row2][col2] = tile1;
        
        tile1.setPosition(row2, col2);
        tile2.setPosition(row1, col1);
        
        const pos1 = this.getTilePosition(row1, col1);
        const pos2 = this.getTilePosition(row2, col2);
        
        this.isAnimating = true;
        
        const promises = [
            this.animateTileMove(tile2.node, pos1),
            this.animateTileMove(tile1.node, pos2)
        ];
        
        await Promise.all(promises);
        this.isAnimating = false;
    }

    private animateTileMove(tileNode: Node, targetPosition: Vec3): Promise<void> {
        return new Promise((resolve) => {
            const tile = tileNode.getComponent(Tile);
            if (tile) {
                tile.startMoving();
            }
            
            tween(tileNode)
                .to(this.animationDuration, { position: targetPosition })
                .call(() => {
                    if (tile) {
                        tile.stopMoving();
                    }
                    resolve();
                })
                .start();
        });
    }

    public async fillEmptySpaces(): Promise<void> {
        this.isAnimating = true;
        
        const movePromises: Promise<void>[] = [];
        for (let col = 0; col < this.boardSize; col++) {
            let emptyRow = this.boardSize - 1;
            for (let row = this.boardSize - 1; row >= 0; row--) {
                if (this.tiles[row][col]) {
                    if (row !== emptyRow) {
                        this.tiles[emptyRow][col] = this.tiles[row][col];
                        this.tiles[row][col] = null;
                        this.tiles[emptyRow][col].setPosition(emptyRow, col);
                        
                        const targetPosition = this.getTilePosition(emptyRow, col);
                        movePromises.push(this.animateTileMove(this.tiles[emptyRow][col].node, targetPosition));
                    }
                    emptyRow--;
                }
            }
        }
        
        if (movePromises.length > 0) {
            await Promise.all(movePromises);
        }
        const spawnPromises: Promise<void>[] = [];
        
        for (let col = 0; col < this.boardSize; col++) {
            let emptyRow = this.boardSize - 1;
            for (let row = this.boardSize - 1; row >= 0; row--) {
                if (this.tiles[row][col]) {
                    emptyRow = row - 1;
                }
            }
            
            for (let row = emptyRow; row >= 0; row--) {
                const tile = this.createTile(row, col);
                this.tiles[row][col] = tile;
                
                const spawnPosition = this.getTilePosition(-1, col);
                const targetPosition = this.getTilePosition(row, col);
                
                tile.node.setPosition(spawnPosition);
                spawnPromises.push(this.animateTileMove(tile.node, targetPosition));
            }
        }
        
        if (spawnPromises.length > 0) {
            await Promise.all(spawnPromises);
        }
        
        this.isAnimating = false;
    }

    public isBoardAnimating(): boolean {
        if (this.isAnimating) {
            return true;
        }
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const tile = this.tiles[row][col];
                if (tile && tile.isAnimating()) {
                    return true;
                }
            }
        }
        return false;
    }

    public findAllMatches(): Tile[] {
        const allMatches: Tile[] = [];
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.tiles[row][col]) {
                    const matches = this.findMatchesAt(row, col);
                    for (const tile of matches) {
                        if (!allMatches.some(t => t === tile)) {
                            allMatches.push(tile);
                        }
                    }
                }
            }
        }
        
        return allMatches;
    }

    public highlightAllMatches(): Tile[] {
        const allMatches = this.findAllMatches();
        allMatches.forEach(tile => {
            tile.highlight();
        });
        return allMatches;
    }

    public removeTile(tile: Tile) {
        const row = tile.getRow();
        const col = tile.getCol();
        
        if (this.tiles[row][col] === tile) {
            this.tiles[row][col] = null;
            tile.destroy();
        }
    }

    public clearBoard() {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.tiles[row][col]) {
                    this.tiles[row][col].destroy();
                    this.tiles[row][col] = null;
                }
            }
        }
    }

    public getTile(row: number, col: number): Tile {
        if (row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize) {
            return this.tiles[row][col];
        }
        return null;
    }

    public getTileAt(row: number, col: number): Tile {
        return this.getTile(row, col);
    }

    public getRows(): number {
        return this.boardSize;
    }

    public getCols(): number {
        return this.boardSize;
    }

    /**
     * @en
     * Find all matches at specific position
     * @zh
     * 在特定位置查找所有匹配
     */
    private findMatchesAt(row: number, col: number): Tile[] {
        const tileType = this.tiles[row][col].getTileType();
        const matches: Tile[] = [];

        let horizontalMatches = [this.tiles[row][col]];
        
        for (let c = col - 1; c >= 0; c--) {
            if (this.tiles[row][c] && this.tiles[row][c].getTileType() === tileType) {
                horizontalMatches.unshift(this.tiles[row][c]);
            } else {
                break;
            }
        }
        
        for (let c = col + 1; c < this.boardSize; c++) {
            if (this.tiles[row][c] && this.tiles[row][c].getTileType() === tileType) {
                horizontalMatches.push(this.tiles[row][c]);
            } else {
                break;
            }
        }

        if (horizontalMatches.length >= 3) {
            for (const tile of horizontalMatches) {
                if (!matches.some(t => t === tile)) {
                    matches.push(tile);
                }
            }
        }

        let verticalMatches = [this.tiles[row][col]];
        
        for (let r = row - 1; r >= 0; r--) {
            if (this.tiles[r] && this.tiles[r][col] && this.tiles[r][col].getTileType() === tileType) {
                verticalMatches.unshift(this.tiles[r][col]);
            } else {
                break;
            }
        }
        
        for (let r = row + 1; r < this.boardSize; r++) {
            if (this.tiles[r] && this.tiles[r][col] && this.tiles[r][col].getTileType() === tileType) {
                verticalMatches.push(this.tiles[r][col]);
            } else {
                break;
            }
        }

        if (verticalMatches.length >= 3) {
            for (const tile of verticalMatches) {
                if (!matches.some(t => t === tile)) {
                    matches.push(tile);
                }
            }
        }

        if (matches.length >= 3) {
            return matches;
        }
        
        if (horizontalMatches.length >= 3) {
            return horizontalMatches;
        }
        
        if (verticalMatches.length >= 3) {
            return verticalMatches;
        }
        
        return [];
    }

    /**
     * @en
     * Find all possible moves on the board
     * @zh
     * 查找棋盘上所有可能的移动
     */
    public findAllPossibleMoves(): { tile1: Tile, tile2: Tile }[] {
        const possibleMoves: { tile1: Tile, tile2: Tile }[] = [];
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const currentTile = this.tiles[row][col];
                if (!currentTile) continue;
                
                const neighbors = [
                    { row: row, col: col + 1 },
                    { row: row + 1, col: col }
                ];
                
                for (const neighbor of neighbors) {
                    if (neighbor.row < this.boardSize && neighbor.col < this.boardSize) {
                        const neighborTile = this.tiles[neighbor.row][neighbor.col];
                        if (neighborTile && this.wouldCreateMatch(currentTile, neighborTile)) {
                            possibleMoves.push({ tile1: currentTile, tile2: neighborTile });
                        }
                    }
                }
            }
        }
        
        return possibleMoves;
    }

    /**
     * @en
     * Check if swapping two tiles would create a match
     * @zh
     * 检查交换两个瓦片是否会创建匹配
     */
    private wouldCreateMatch(tile1: Tile, tile2: Tile): boolean {
        const originalType1 = tile1.getTileType();
        const originalType2 = tile2.getTileType();
        
        tile1.setTileType(originalType2);
        tile2.setTileType(originalType1);
        
        const matches1 = this.findMatches(tile1);
        const matches2 = this.findMatches(tile2);
        
        const allMatches: Tile[] = [...matches1];
        for (const tile of matches2) {
            if (!allMatches.some(t => t === tile)) {
                allMatches.push(tile);
            }
        }
        
        tile1.setTileType(originalType1);
        tile2.setTileType(originalType2);
        
        return allMatches.length >= 3;
    }


} 