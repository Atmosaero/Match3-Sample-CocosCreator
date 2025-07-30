import { _decorator, Component, Node, Prefab, Label, Button, Sprite, Color } from 'cc';
import { Tile } from './Tile';
import { Board } from './Board';
import { AudioManager } from './AudioManager';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    @property(Prefab)
    tilePrefab: Prefab = null;

    @property(Node)
    boardNode: Node = null;

    @property(Label)
    scoreLabel: Label = null;

    @property(Label)
    movesLabel: Label = null;

    private board: Board = null;
    private score: number = 0;
    private moves: number = 0;
    public isProcessing: boolean = false;
    private isPaused: boolean = false;

    start() {
        this.initializeGame();
    }

    private initializeGame() {
        this.board = this.boardNode.getComponent(Board);
        if (!this.board) {
            this.board = this.boardNode.addComponent(Board);
        }
        
        this.isProcessing = false;
        
        this.board.initialize(this.tilePrefab, this);
        this.updateUI();
    }

    


    /**
     * @en
     * Handle tile swipe event from player
     * @zh
     * 处理玩家的瓦片滑动事件
     */
    public onTileSwiped(tile: Tile, direction: string) {
        if (tile.isAnimating()) {
            return;
        }

        if (this.isPaused) {
            return;
        }


        
        const adjacentTile = this.getAdjacentTile(tile, direction);
        
        if (adjacentTile) {
            if (adjacentTile.isAnimating()) {
                return;
            }
            
            this.trySwapTiles(tile, adjacentTile);
        }
    }

    private getAdjacentTile(tile: Tile, direction: string): Tile | null {
        const row = tile.getRow();
        const col = tile.getCol();
        
        let targetRow = row;
        let targetCol = col;
        
        switch (direction) {
            case 'up':
                targetRow = row + 1;
                break;
            case 'down':
                targetRow = row - 1;
                break;
            case 'left':
                targetCol = col - 1;
                break;
            case 'right':
                targetCol = col + 1;
                break;
        }
        
        if (targetRow < 0 || targetRow >= this.board.getRows() || 
            targetCol < 0 || targetCol >= this.board.getCols()) {
            return null;
        }
        
        return this.board.getTileAt(targetRow, targetCol);
    }

    private areAdjacent(tile1: Tile, tile2: Tile): boolean {
        const rowDiff = Math.abs(tile1.getRow() - tile2.getRow());
        const colDiff = Math.abs(tile1.getCol() - tile2.getCol());
        
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }

    /**
     * @en
     * Try to swap two tiles and check for matches
     * @zh
     * 尝试交换两个瓦片并检查匹配
     */
    private async trySwapTiles(tile1: Tile, tile2: Tile) {
        try {
            await this.board.swapTiles(tile1, tile2);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            const matches1 = this.board.findMatches(tile1);
            const matches2 = this.board.findMatches(tile2);
            
            const allMatches = this.mergeMatches(matches1, matches2);
            
            if (allMatches.length >= 3) {
                const audioManager = AudioManager.getInstance();
                if (audioManager) {
                    audioManager.playSwapSuccess();
                }
                
                this.moves++;
                
                allMatches.forEach(match => {
                    match.startBlinking();
                });
                
                this.scheduleOnce(() => {
                    this.processMatches(allMatches, true);
                }, 0.4);
            } else {
                await this.board.swapTiles(tile1, tile2);
                
                const audioManager = AudioManager.getInstance();
                if (audioManager) {
                    audioManager.playSwapFail();
                }
                

            }
        } catch (error) {
            const audioManager = AudioManager.getInstance();
            if (audioManager) {
                audioManager.playSwapFail();
            }
        }
    }

    private mergeMatches(matches1: Tile[], matches2: Tile[]): Tile[] {
        const merged = [...matches1];
        
        for (const tile of matches2) {
            if (!merged.some(t => t === tile)) {
                merged.push(tile);
            }
        }
        
        return merged;
    }

    /**
     * @en
     * Process matched tiles and handle chain reactions
     * @zh
     * 处理匹配的瓦片并处理连锁反应
     */
    private async processMatches(matches: Tile[], isPlayerMove: boolean = false) {
        if (matches.length === 0) {
            return;
        }
        
        this.board.stopAllBlinking();
        
        const audioManager = AudioManager.getInstance();
        if (audioManager) {
            audioManager.playDestroyBlocks();
        }
        
        for (const tile of matches) {
            this.board.removeTile(tile);
        }

        this.score += matches.length * 10;

        await this.board.fillEmptySpaces();

        const newMatches = this.board.findAllMatches();
        
        if (newMatches.length > 0) {
            newMatches.forEach(match => {
                match.startBlinking();
            });
            
            this.scheduleOnce(() => {
                this.processMatches(newMatches, false);
            }, 0.4);
        }

        this.updateUI();
    }



    private updateUI() {
        if (this.scoreLabel) {
            this.scoreLabel.string = `${this.score}`;
        }
        if (this.movesLabel) {
            this.movesLabel.string = `${this.moves}`;
        }

    }
} 