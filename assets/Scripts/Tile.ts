import { _decorator, Component, Node, Sprite, SpriteFrame, Button, Color, tween, Tween, input, Input, EventTouch, Vec2 } from 'cc';
import { GameManager } from './GameManager';

const { ccclass, property } = _decorator;

export enum TileType {
    RED = 0,
    BLUE = 1,
    GREEN = 2,
    YELLOW = 3,
    PURPLE = 4,
    ORANGE = 5
}

@ccclass('Tile')
export class Tile extends Component {
    @property(Sprite)
    sprite: Sprite = null;

    @property([SpriteFrame])
    tileSprites: SpriteFrame[] = [];

    @property(Button)
    button: Button = null;

    private tileType: TileType = TileType.RED;
    private gameManager: GameManager = null;
    private row: number = 0;
    private col: number = 0;
    private originalColor: Color = null;
    private isHighlighted: boolean = false;
    private isBlinking: boolean = false;
    private blinkTween: Tween<Sprite> = null;
    /**
     * @en
     * Flag for movement animation
     * @zh
     * 移动动画标志
     */
    private isMoving: boolean = false;
    
    /**
     * @en
     * Swipe variables
     * @zh
     * 滑动变量
     */
    private touchStartPos: Vec2 = null;
    /**
     * @en
     * Minimum distance for swipe
     * @zh
     * 滑动的最小距离
     */
    private minSwipeDistance: number = 15;
    private isTouchActive: boolean = false;

    start() {
        this.setupTouchEvents();
        this.saveOriginalColor();
    }

    /**
     * @en
     * Setup touch event handlers
     * @zh
     * 设置触摸事件处理器
     */
    private setupTouchEvents() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private onTouchStart(event: EventTouch) {
        this.touchStartPos = event.getLocation();
        this.isTouchActive = true;
    }

    /**
     * @en
     * Handle touch move event
     * @zh
     * 处理触摸移动事件
     */
    private onTouchMove(event: EventTouch) {
        if (!this.isTouchActive || !this.touchStartPos) {
            return;
        }
        
        const currentPos = event.getLocation();
        const deltaX = currentPos.x - this.touchStartPos.x;
        const deltaY = currentPos.y - this.touchStartPos.y;
    }

    /**
     * @en
     * Handle touch end event
     * @zh
     * 处理触摸结束事件
     */
    private onTouchEnd(event: EventTouch) {
        if (!this.isTouchActive || !this.touchStartPos) {
            return;
        }
        
        const endPos = event.getLocation();
        const deltaX = endPos.x - this.touchStartPos.x;
        const deltaY = endPos.y - this.touchStartPos.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance >= this.minSwipeDistance) {
            const direction = this.getSwipeDirection(deltaX, deltaY);
            
            if (direction !== 'none' && this.gameManager) {
                this.gameManager.onTileSwiped(this, direction);
            }
        }
        
        this.isTouchActive = false;
        this.touchStartPos = null;
    }

    /**
     * @en
     * Determine swipe direction from delta coordinates
     * @zh
     * 根据坐标差值确定滑动方向
     */
    private getSwipeDirection(deltaX: number, deltaY: number): string {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        
        const totalDistance = absX + absY;
        if (totalDistance > 0) {
            const xRatio = absX / totalDistance;
            const yRatio = absY / totalDistance;
            
            if (Math.abs(xRatio - yRatio) < 0.2) {
                return 'none';
            }
        }
        
        if (absX > absY) {
            return deltaX > 0 ? 'right' : 'left';
        } else {
            return deltaY > 0 ? 'down' : 'up';
        }
    }

    private saveOriginalColor() {
        if (this.sprite) {
            this.originalColor = this.sprite.color.clone();
        }
    }

    /**
     * @en
     * Highlight the tile by making it brighter and larger
     * @zh
     * 通过使瓦片更亮和更大来高亮显示
     */
    public highlight() {
        if (this.sprite && !this.isHighlighted) {
            this.isHighlighted = true;
            this.sprite.color = new Color(255, 255, 255, 255);
            this.node.setScale(1.1, 1.1, 1.1);
        }
    }

    /**
     * @en
     * Remove highlight and restore original color and size
     * @zh
     * 移除高亮并恢复原始颜色和大小
     */
    public unhighlight() {
        if (this.sprite && this.isHighlighted) {
            this.isHighlighted = false;
            if (this.originalColor) {
                this.sprite.color = this.originalColor;
            } else {
                this.sprite.color = new Color(255, 255, 255, 255);
            }
            this.node.setScale(1, 1, 1);
        }
    }

    /**
     * @en
     * Start blinking animation for the tile
     * @zh
     * 开始瓦片的闪烁动画
     */
    public startBlinking() {
        if (this.sprite && !this.isBlinking) {
            this.isBlinking = true;
            
            if (this.blinkTween) {
                this.blinkTween.stop();
            }
            
            this.blinkTween = tween(this.sprite)
                .to(0.15, { color: new Color(255, 255, 255, 100) })
                .to(0.15, { color: new Color(255, 255, 255, 255) })
                .union()
                .repeatForever()
                .start();
        }
    }

    /**
     * @en
     * Stop blinking animation and restore normal color
     * @zh
     * 停止闪烁动画并恢复正常颜色
     */
    public stopBlinking() {
        if (this.sprite && this.isBlinking) {
            this.isBlinking = false;
            
            if (this.blinkTween) {
                this.blinkTween.stop();
                this.blinkTween = null;
            }
            
            if (this.originalColor) {
                this.sprite.color = this.originalColor;
            } else {
                this.sprite.color = new Color(255, 255, 255, 255);
            }
        }
    }

    public isHighlightedTile(): boolean {
        return this.isHighlighted;
    }

    public isBlinkingTile(): boolean {
        return this.isBlinking;
    }

    /**
     * @en
     * Check if tile is currently animating
     * Highlight is not considered an animation that should block interaction
     * @zh
     * 检查瓦片是否正在动画中
     * 高亮不被认为是应该阻止交互的动画
     */
    public isAnimating(): boolean {
        return this.isBlinking || this.isMoving;
    }

    public startMoving() {
        this.isMoving = true;
    }

    public stopMoving() {
        this.isMoving = false;
    }

    public initialize(type: TileType, gameManager: GameManager, row: number, col: number) {
        this.tileType = type;
        this.gameManager = gameManager;
        this.row = row;
        this.col = col;
        this.updateSprite();
    }

    private updateSprite() {
        if (this.sprite && this.tileSprites[this.tileType]) {
            this.sprite.spriteFrame = this.tileSprites[this.tileType];
        }
    }

    public getTileType(): TileType {
        return this.tileType;
    }

    public setTileType(type: TileType) {
        this.tileType = type;
        this.updateSprite();
    }

    public getRow(): number {
        return this.row;
    }

    public getCol(): number {
        return this.col;
    }

    public setPosition(row: number, col: number) {
        this.row = row;
        this.col = col;
    }

    public destroy(): boolean {
        this.node.destroy();
        return super.destroy();
    }
} 